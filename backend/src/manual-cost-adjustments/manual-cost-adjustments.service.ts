import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { InventoryCostBalanceEntity } from '../inventory-cost-engine/entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryCostSourceType } from '../inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from '../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';
import { ItemEntity } from '../inventory/entities/item.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import type { CreateManualCostAdjustmentDto, CreateManualCostAdjustmentLineDto } from './dto/create-manual-cost-adjustment.dto';
import type { ManualCostAdjustmentFilterDto } from './dto/manual-cost-adjustment-filter.dto';
import { ManualCostAdjustmentLineEntity } from './entities/manual-cost-adjustment-line.entity';
import { ManualCostAdjustmentEntity } from './entities/manual-cost-adjustment.entity';
import { ManualCostAdjustmentStatus } from './enums/manual-cost-adjustment-status.enum';
import { ManualCostAdjustmentType } from './enums/manual-cost-adjustment-type.enum';

@Injectable()
export class ManualCostAdjustmentsService {
  constructor(
    @InjectRepository(ManualCostAdjustmentEntity)
    private readonly repository: Repository<ManualCostAdjustmentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateManualCostAdjustmentDto, companyId: string, userId: string): Promise<ManualCostAdjustmentEntity> {
    const uniqueKeys = new Set(dto.lines.map((line) => `${line.itemId}:${line.warehouseId}`));
    if (uniqueKeys.size !== dto.lines.length) {
      throw new BadRequestException('Only one adjustment line is allowed per item and warehouse.');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.validateAccounts(manager.getRepository(AccountEntity), companyId, dto.gainAccountId, dto.lossAccountId);
      const lineRepository = manager.getRepository(ManualCostAdjustmentLineEntity);
      const calculatedLines: ManualCostAdjustmentLineEntity[] = [];

      for (const input of dto.lines) {
        calculatedLines.push(await this.calculateLine(manager, input, companyId, lineRepository));
      }

      const totalIncrease = this.round4(calculatedLines.filter((line) => line.valueChange > 0).reduce((sum, line) => sum + line.valueChange, 0));
      const totalDecrease = this.round4(calculatedLines.filter((line) => line.valueChange < 0).reduce((sum, line) => sum + Math.abs(line.valueChange), 0));
      if (totalIncrease === 0 && totalDecrease === 0) throw new BadRequestException('The adjustment does not change inventory quantity or value.');

      const repository = manager.getRepository(ManualCostAdjustmentEntity);
      return repository.save(repository.create({
        companyId,
        adjustmentNumber: await this.nextNumber(repository, companyId, dto.adjustmentDate),
        adjustmentDate: dto.adjustmentDate,
        status: ManualCostAdjustmentStatus.DRAFT,
        gainAccountId: dto.gainAccountId,
        lossAccountId: dto.lossAccountId,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        totalIncrease,
        totalDecrease,
        journalEntryId: null,
        notes: dto.notes?.trim() || null,
        createdBy: userId,
        postedBy: null,
        postedAt: null,
        lines: calculatedLines,
      }));
    });
  }

  async post(id: string, companyId: string, userId: string): Promise<ManualCostAdjustmentEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ManualCostAdjustmentEntity);
      const adjustment = await repository.createQueryBuilder('adjustment')
        .leftJoinAndSelect('adjustment.lines', 'line')
        .setLock('pessimistic_write')
        .where('adjustment.id = :id AND adjustment.companyId = :companyId', { id, companyId })
        .getOne();

      if (!adjustment) throw new NotFoundException('Manual cost adjustment not found.');
      if (adjustment.status !== ManualCostAdjustmentStatus.DRAFT) throw new ConflictException('Only draft manual cost adjustments can be posted.');

      const settings = await manager.getRepository(AccountingSettingsEntity).findOne({ where: { companyId } });
      if (!settings?.inventoryAccountId) throw new ConflictException('Inventory account is not configured.');

      const balanceRepository = manager.getRepository(InventoryCostBalanceEntity);
      const transactionRepository = manager.getRepository(InventoryCostTransactionEntity);

      for (const line of adjustment.lines) {
        const balance = await balanceRepository.createQueryBuilder('balance')
          .setLock('pessimistic_write')
          .where('balance.companyId = :companyId AND balance.itemId = :itemId AND balance.warehouseId = :warehouseId', {
            companyId,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
          })
          .getOne();

        const currentQuantity = balance?.quantity ?? 0;
        const currentValue = balance?.inventoryValue ?? 0;
        const currentAverage = balance?.averageUnitCost ?? 0;
        if (
          this.round4(currentQuantity) !== this.round4(line.oldQuantity)
          || this.round4(currentValue) !== this.round4(line.oldValue)
          || this.round6(currentAverage) !== this.round6(line.oldAverageUnitCost)
        ) {
          throw new ConflictException('Inventory changed after the adjustment was prepared. Create a new adjustment.');
        }

        const target = balance ?? balanceRepository.create({ companyId, itemId: line.itemId, warehouseId: line.warehouseId });
        target.quantity = line.newQuantity;
        target.inventoryValue = line.newValue;
        target.averageUnitCost = line.newAverageUnitCost;
        await balanceRepository.save(target);

        await transactionRepository.save(transactionRepository.create({
          companyId,
          itemId: line.itemId,
          warehouseId: line.warehouseId,
          transactionDate: adjustment.adjustmentDate,
          transactionType: line.valueChange >= 0 ? InventoryCostTransactionType.ADJUSTMENT_IN : InventoryCostTransactionType.ADJUSTMENT_OUT,
          sourceType: InventoryCostSourceType.STOCK_ADJUSTMENT,
          sourceId: adjustment.id,
          sourceLineId: line.id,
          quantity: Math.abs(line.quantityChange),
          unitCost: line.unitCost,
          totalCost: Math.abs(line.valueChange),
          quantityAfter: line.newQuantity,
          averageUnitCostAfter: line.newAverageUnitCost,
          inventoryValueAfter: line.newValue,
          createdBy: userId,
        }));
      }

      const journal = await this.createJournal(manager, adjustment, settings.inventoryAccountId, userId);
      adjustment.status = ManualCostAdjustmentStatus.POSTED;
      adjustment.journalEntryId = journal.id;
      adjustment.postedBy = userId;
      adjustment.postedAt = new Date();
      return repository.save(adjustment);
    });
  }

  async findAll(filter: ManualCostAdjustmentFilterDto, companyId: string): Promise<{ data: ManualCostAdjustmentEntity[]; total: number; page: number; limit: number }> {
    const query = this.repository.createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.lines', 'lines')
      .where('adjustment.companyId = :companyId', { companyId });
    if (filter.status) query.andWhere('adjustment.status = :status', { status: filter.status });
    if (filter.dateFrom) query.andWhere('adjustment.adjustmentDate >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) query.andWhere('adjustment.adjustmentDate <= :dateTo', { dateTo: filter.dateTo });
    const [data, total] = await query.orderBy('adjustment.adjustmentDate', 'DESC').addOrderBy('adjustment.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit).take(filter.limit).getManyAndCount();
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(id: string, companyId: string): Promise<ManualCostAdjustmentEntity> {
    const adjustment = await this.repository.findOne({ where: { id, companyId }, relations: { lines: true } });
    if (!adjustment) throw new NotFoundException('Manual cost adjustment not found.');
    return adjustment;
  }

  private async calculateLine(
    manager: EntityManager,
    input: CreateManualCostAdjustmentLineDto,
    companyId: string,
    lineRepository: Repository<ManualCostAdjustmentLineEntity>,
  ): Promise<ManualCostAdjustmentLineEntity> {
    const [item, warehouse, balance] = await Promise.all([
      manager.getRepository(ItemEntity).findOne({ where: { id: input.itemId, companyId } }),
      manager.getRepository(WarehouseEntity).findOne({ where: { id: input.warehouseId, companyId, isActive: true } }),
      manager.getRepository(InventoryCostBalanceEntity).findOne({ where: { companyId, itemId: input.itemId, warehouseId: input.warehouseId } }),
    ]);
    if (!item) throw new NotFoundException(`Item ${input.itemId} was not found.`);
    if (!warehouse) throw new NotFoundException(`Active warehouse ${input.warehouseId} was not found.`);

    const oldQuantity = this.round4(balance?.quantity ?? 0);
    const oldValue = this.round4(balance?.inventoryValue ?? 0);
    const oldAverage = this.round6(balance?.averageUnitCost ?? 0);
    let quantityChange = 0;
    let valueChange = 0;
    let unitCost = oldAverage;

    switch (input.adjustmentType) {
      case ManualCostAdjustmentType.QUANTITY_IN:
        if (input.quantity === undefined || input.unitCost === undefined) throw new BadRequestException('Quantity and unit cost are required for a quantity increase.');
        quantityChange = this.round4(input.quantity);
        unitCost = this.round6(input.unitCost);
        valueChange = this.round4(quantityChange * unitCost);
        break;
      case ManualCostAdjustmentType.QUANTITY_OUT:
        if (input.quantity === undefined) throw new BadRequestException('Quantity is required for a quantity decrease.');
        quantityChange = -this.round4(input.quantity);
        if (Math.abs(quantityChange) > oldQuantity) throw new ConflictException('Quantity decrease cannot create negative inventory.');
        valueChange = -this.round4(Math.abs(quantityChange) * oldAverage);
        break;
      case ManualCostAdjustmentType.VALUE_IN:
        if (input.valueAmount === undefined) throw new BadRequestException('Value amount is required for a value increase.');
        if (oldQuantity <= 0) throw new ConflictException('Value-only adjustments require positive on-hand quantity.');
        valueChange = this.round4(input.valueAmount);
        break;
      case ManualCostAdjustmentType.VALUE_OUT:
        if (input.valueAmount === undefined) throw new BadRequestException('Value amount is required for a value decrease.');
        if (oldQuantity <= 0) throw new ConflictException('Value-only adjustments require positive on-hand quantity.');
        valueChange = -this.round4(input.valueAmount);
        if (Math.abs(valueChange) > oldValue) throw new ConflictException('Value decrease cannot create negative inventory value.');
        break;
    }

    const newQuantity = this.round4(oldQuantity + quantityChange);
    const newValue = this.round4(oldValue + valueChange);
    if (newQuantity < 0 || newValue < 0) throw new ConflictException('Adjustment cannot create negative inventory quantity or value.');
    const newAverage = newQuantity === 0 ? 0 : this.round6(newValue / newQuantity);

    return lineRepository.create({
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      adjustmentType: input.adjustmentType,
      quantityChange,
      valueChange,
      unitCost,
      oldQuantity,
      newQuantity,
      oldValue,
      newValue,
      oldAverageUnitCost: oldAverage,
      newAverageUnitCost: newAverage,
      reason: input.reason?.trim() || null,
    });
  }

  private async validateAccounts(repository: Repository<AccountEntity>, companyId: string, gainAccountId: string, lossAccountId: string): Promise<void> {
    const [gain, loss] = await Promise.all([
      repository.findOne({ where: { id: gainAccountId, companyId } }),
      repository.findOne({ where: { id: lossAccountId, companyId } }),
    ]);
    if (!gain || gain.status !== AccountStatus.ACTIVE || gain.isGroup || gain.type !== AccountType.INCOME) throw new BadRequestException('Gain account must be an active posting income account.');
    if (!loss || loss.status !== AccountStatus.ACTIVE || loss.isGroup || loss.type !== AccountType.EXPENSE) throw new BadRequestException('Loss account must be an active posting expense account.');
  }

  private async createJournal(manager: EntityManager, adjustment: ManualCostAdjustmentEntity, inventoryAccountId: string, userId: string): Promise<JournalEntryEntity> {
    const entryRepository = manager.getRepository(JournalEntryEntity);
    const lineRepository = manager.getRepository(JournalEntryLineEntity);
    const lines: Array<Partial<JournalEntryLineEntity>> = [];
    if (adjustment.totalIncrease > 0) {
      lines.push(
        { accountId: inventoryAccountId, debit: adjustment.totalIncrease, credit: 0, description: `Manual cost adjustment ${adjustment.adjustmentNumber}` },
        { accountId: adjustment.gainAccountId, debit: 0, credit: adjustment.totalIncrease, description: `Inventory adjustment gain ${adjustment.adjustmentNumber}` },
      );
    }
    if (adjustment.totalDecrease > 0) {
      lines.push(
        { accountId: adjustment.lossAccountId, debit: adjustment.totalDecrease, credit: 0, description: `Inventory adjustment loss ${adjustment.adjustmentNumber}` },
        { accountId: inventoryAccountId, debit: 0, credit: adjustment.totalDecrease, description: `Manual cost adjustment ${adjustment.adjustmentNumber}` },
      );
    }
    const total = this.round2(adjustment.totalIncrease + adjustment.totalDecrease);
    const entry = await entryRepository.save(entryRepository.create({
      companyId: adjustment.companyId,
      entryNumber: await this.nextJournalNumber(entryRepository, adjustment.companyId, adjustment.adjustmentDate),
      entryDate: adjustment.adjustmentDate,
      status: JournalEntryStatus.POSTED,
      sourceType: JournalEntrySourceType.INVENTORY_ADJUSTMENT,
      sourceId: adjustment.id,
      referenceNumber: adjustment.adjustmentNumber,
      currency: adjustment.currency,
      totalDebit: total,
      totalCredit: total,
      narration: `Manual inventory cost adjustment ${adjustment.adjustmentNumber}`,
      createdBy: userId,
      updatedBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      reversedBy: null,
      reversedAt: null,
      reversalReason: null,
      reversalEntryId: null,
      lines: [],
    }));
    entry.lines = await lineRepository.save(lines.map((line) => lineRepository.create({ ...line, journalEntryId: entry.id, partyType: null, partyId: null, costCenter: null })));
    return entry;
  }

  private async nextNumber(repository: Repository<ManualCostAdjustmentEntity>, companyId: string, date: string): Promise<string> {
    const year = date.slice(0, 4);
    const count = await repository.createQueryBuilder('adjustment').where('adjustment.companyId = :companyId', { companyId })
      .andWhere('adjustment.adjustmentNumber LIKE :prefix', { prefix: `MCA-${year}-%` }).getCount();
    return `MCA-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextJournalNumber(repository: Repository<JournalEntryEntity>, companyId: string, date: string): Promise<string> {
    const year = date.slice(0, 4);
    const count = await repository.createQueryBuilder('entry').where('entry.companyId = :companyId', { companyId })
      .andWhere('entry.entryNumber LIKE :prefix', { prefix: `JE-${year}-%` }).getCount();
    return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private round2(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
  private round4(value: number): number { return Math.round((value + Number.EPSILON) * 10000) / 10000; }
  private round6(value: number): number { return Math.round((value + Number.EPSILON) * 1000000) / 1000000; }
}
