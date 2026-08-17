import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { InventoryCostBalanceEntity } from '../inventory-cost-engine/entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryCostSourceType } from '../inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from '../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import type { CreateInventoryRevaluationDto } from './dto/create-inventory-revaluation.dto';
import type { InventoryRevaluationFilterDto } from './dto/inventory-revaluation-filter.dto';
import { InventoryRevaluationEntity } from './entities/inventory-revaluation.entity';
import { InventoryRevaluationLineEntity } from './entities/inventory-revaluation-line.entity';
import { InventoryRevaluationStatus } from './enums/inventory-revaluation-status.enum';
@Injectable()
export class InventoryRevaluationService {
  constructor(@InjectRepository(InventoryRevaluationEntity) private readonly repository: Repository<InventoryRevaluationEntity>, private readonly dataSource: DataSource) {}
  async create(dto: CreateInventoryRevaluationDto, companyId: string, userId: string): Promise<InventoryRevaluationEntity> {
    if (new Set(dto.lines.map((line) => `${line.itemId}:${line.warehouseId}`)).size !== dto.lines.length) throw new BadRequestException('Duplicate item and warehouse lines are not allowed.');
    return this.dataSource.transaction(async (manager) => {
      await this.validateAccounts(manager.getRepository(AccountEntity), companyId, dto.gainAccountId, dto.lossAccountId);
      const balanceRepository = manager.getRepository(InventoryCostBalanceEntity);
      const lineRepository = manager.getRepository(InventoryRevaluationLineEntity);
      const calculated: InventoryRevaluationLineEntity[] = [];
      for (const input of dto.lines) {
        const balance = await balanceRepository.findOne({ where: { companyId, itemId: input.itemId, warehouseId: input.warehouseId } });
        if (!balance) throw new NotFoundException(`Inventory balance not found for item ${input.itemId} and warehouse ${input.warehouseId}.`);
        if (balance.quantity <= 0) throw new ConflictException('Only positive on-hand quantities can be revalued.');
        const oldValue = this.round4(balance.inventoryValue);
        const newValue = this.round4(balance.quantity * input.newUnitCost);
        calculated.push(lineRepository.create({ itemId: input.itemId, warehouseId: input.warehouseId, quantity: balance.quantity, oldUnitCost: balance.averageUnitCost, newUnitCost: this.round6(input.newUnitCost), oldValue, newValue, adjustmentAmount: this.round4(newValue - oldValue) }));
      }
      if (calculated.every((line) => line.adjustmentAmount === 0)) throw new BadRequestException('The revaluation does not change inventory value.');
      const repo = manager.getRepository(InventoryRevaluationEntity);
      const entity = repo.create({ companyId, revaluationNumber: await this.nextNumber(manager.getRepository(InventoryRevaluationEntity), companyId, dto.revaluationDate), revaluationDate: dto.revaluationDate, status: InventoryRevaluationStatus.DRAFT, gainAccountId: dto.gainAccountId, lossAccountId: dto.lossAccountId, currency: (dto.currency ?? 'EUR').toUpperCase(), totalIncrease: this.round4(calculated.filter((x) => x.adjustmentAmount > 0).reduce((s, x) => s + x.adjustmentAmount, 0)), totalDecrease: this.round4(calculated.filter((x) => x.adjustmentAmount < 0).reduce((s, x) => s + Math.abs(x.adjustmentAmount), 0)), journalEntryId: null, notes: dto.notes?.trim() || null, createdBy: userId, postedBy: null, postedAt: null, lines: calculated });
      return repo.save(entity);
    });
  }
  async post(id: string, companyId: string, userId: string): Promise<InventoryRevaluationEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryRevaluationEntity);
      const revaluation = await repo.createQueryBuilder('r').leftJoinAndSelect('r.lines', 'line').setLock('pessimistic_write').where('r.id = :id AND r.companyId = :companyId', { id, companyId }).getOne();
      if (!revaluation) throw new NotFoundException('Inventory revaluation not found.');
      if (revaluation.status !== InventoryRevaluationStatus.DRAFT) throw new ConflictException('Only draft inventory revaluations can be posted.');
      const settings = await manager.getRepository(AccountingSettingsEntity).findOne({ where: { companyId } });
      if (!settings?.inventoryAccountId) throw new ConflictException('Inventory account is not configured.');
      const balanceRepo = manager.getRepository(InventoryCostBalanceEntity);
      const transactionRepo = manager.getRepository(InventoryCostTransactionEntity);
      for (const line of revaluation.lines) {
        const balance = await balanceRepo.createQueryBuilder('b').setLock('pessimistic_write').where('b.companyId = :companyId AND b.itemId = :itemId AND b.warehouseId = :warehouseId', { companyId, itemId: line.itemId, warehouseId: line.warehouseId }).getOne();
        if (!balance) throw new NotFoundException('Inventory balance no longer exists.');
        if (this.round4(balance.quantity) !== this.round4(line.quantity) || this.round4(balance.inventoryValue) !== this.round4(line.oldValue)) throw new ConflictException('Inventory changed after the revaluation was prepared. Create a new revaluation.');
        balance.averageUnitCost = line.newUnitCost; balance.inventoryValue = line.newValue; await balanceRepo.save(balance);
        await transactionRepo.save(transactionRepo.create({ companyId, itemId: line.itemId, warehouseId: line.warehouseId, transactionDate: revaluation.revaluationDate, transactionType: line.adjustmentAmount >= 0 ? InventoryCostTransactionType.ADJUSTMENT_IN : InventoryCostTransactionType.ADJUSTMENT_OUT, sourceType: InventoryCostSourceType.STOCK_ADJUSTMENT, sourceId: revaluation.id, sourceLineId: line.id, quantity: 0, unitCost: line.newUnitCost, totalCost: Math.abs(line.adjustmentAmount), quantityAfter: balance.quantity, averageUnitCostAfter: balance.averageUnitCost, inventoryValueAfter: balance.inventoryValue, createdBy: userId }));
      }
      const journal = await this.createJournal(manager, revaluation, settings.inventoryAccountId, userId);
      revaluation.status = InventoryRevaluationStatus.POSTED; revaluation.journalEntryId = journal.id; revaluation.postedBy = userId; revaluation.postedAt = new Date();
      return repo.save(revaluation);
    });
  }
  async findAll(filter: InventoryRevaluationFilterDto, companyId: string): Promise<{ data: InventoryRevaluationEntity[]; total: number; page: number; limit: number }> {
    const qb = this.repository.createQueryBuilder('r').leftJoinAndSelect('r.lines', 'lines').where('r.companyId = :companyId', { companyId });
    if (filter.status) qb.andWhere('r.status = :status', { status: filter.status });
    if (filter.dateFrom) qb.andWhere('r.revaluationDate >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) qb.andWhere('r.revaluationDate <= :dateTo', { dateTo: filter.dateTo });
    const [data, total] = await qb.orderBy('r.revaluationDate', 'DESC').addOrderBy('r.createdAt', 'DESC').skip((filter.page - 1) * filter.limit).take(filter.limit).getManyAndCount();
    return { data, total, page: filter.page, limit: filter.limit };
  }
  async findOne(id: string, companyId: string): Promise<InventoryRevaluationEntity> { const row = await this.repository.findOne({ where: { id, companyId }, relations: { lines: true } }); if (!row) throw new NotFoundException('Inventory revaluation not found.'); return row; }
  private async validateAccounts(repo: Repository<AccountEntity>, companyId: string, gainId: string, lossId: string): Promise<void> { const [gain, loss] = await Promise.all([repo.findOne({ where: { id: gainId, companyId } }), repo.findOne({ where: { id: lossId, companyId } })]); if (!gain || gain.status !== AccountStatus.ACTIVE || gain.isGroup || gain.type !== AccountType.INCOME) throw new BadRequestException('Gain account must be an active posting income account.'); if (!loss || loss.status !== AccountStatus.ACTIVE || loss.isGroup || loss.type !== AccountType.EXPENSE) throw new BadRequestException('Loss account must be an active posting expense account.'); }
  private async createJournal(manager: import('typeorm').EntityManager, r: InventoryRevaluationEntity, inventoryAccountId: string, userId: string): Promise<JournalEntryEntity> { const entryRepo = manager.getRepository(JournalEntryEntity); const lineRepo = manager.getRepository(JournalEntryLineEntity); const lines: Array<Partial<JournalEntryLineEntity>> = []; if (r.totalIncrease > 0) { lines.push({ accountId: inventoryAccountId, debit: r.totalIncrease, credit: 0, description: `Inventory revaluation ${r.revaluationNumber}` }, { accountId: r.gainAccountId, debit: 0, credit: r.totalIncrease, description: `Inventory revaluation gain ${r.revaluationNumber}` }); } if (r.totalDecrease > 0) { lines.push({ accountId: r.lossAccountId, debit: r.totalDecrease, credit: 0, description: `Inventory revaluation loss ${r.revaluationNumber}` }, { accountId: inventoryAccountId, debit: 0, credit: r.totalDecrease, description: `Inventory revaluation ${r.revaluationNumber}` }); } const total = this.round2(r.totalIncrease + r.totalDecrease); const entry = await entryRepo.save(entryRepo.create({ companyId: r.companyId, entryNumber: await this.nextJournalNumber(entryRepo, r.companyId, r.revaluationDate), entryDate: r.revaluationDate, status: JournalEntryStatus.POSTED, sourceType: JournalEntrySourceType.INVENTORY_ADJUSTMENT, sourceId: r.id, referenceNumber: r.revaluationNumber, currency: r.currency, totalDebit: total, totalCredit: total, narration: `Inventory revaluation ${r.revaluationNumber}`, createdBy: userId, updatedBy: userId, postedBy: userId, postedAt: new Date(), reversedBy: null, reversedAt: null, reversalReason: null, reversalEntryId: null, lines: [] })); entry.lines = await lineRepo.save(lines.map((line) => lineRepo.create({ ...line, journalEntryId: entry.id, partyType: null, partyId: null, costCenter: null }))); return entry; }
  private async nextNumber(repo: Repository<InventoryRevaluationEntity>, companyId: string, date: string): Promise<string> { const year = date.slice(0, 4); const count = await repo.createQueryBuilder('r').where('r.companyId = :companyId', { companyId }).andWhere('r.revaluationNumber LIKE :prefix', { prefix: `IR-${year}-%` }).getCount(); return `IR-${year}-${String(count + 1).padStart(6, '0')}`; }
  private async nextJournalNumber(repo: Repository<JournalEntryEntity>, companyId: string, date: string): Promise<string> { const year = date.slice(0, 4); const count = await repo.createQueryBuilder('e').where('e.companyId = :companyId', { companyId }).andWhere('e.entryNumber LIKE :prefix', { prefix: `JE-${year}-%` }).getCount(); return `JE-${year}-${String(count + 1).padStart(6, '0')}`; }
  private round2(v: number): number { return Math.round((v + Number.EPSILON) * 100) / 100; } private round4(v: number): number { return Math.round((v + Number.EPSILON) * 10000) / 10000; } private round6(v: number): number { return Math.round((v + Number.EPSILON) * 1000000) / 1000000; }
}
