import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { FinishedGoodsReceiptEntity } from '../finished-goods/entities/finished-goods-receipt.entity';
import { FinishedGoodsReceiptStatus } from '../finished-goods/enums/finished-goods-receipt-status.enum';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { MaterialConsumptionEntity } from '../material-consumption/entities/material-consumption.entity';
import { MaterialConsumptionStatus } from '../material-consumption/enums/material-consumption-status.enum';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { UpsertWipAccountingSettingsDto } from './dto/upsert-wip-accounting-settings.dto';
import { WipPostingFilterDto } from './dto/wip-posting-filter.dto';
import { WipAccountingSettingsEntity } from './entities/wip-accounting-settings.entity';
import { WipPostingEntity } from './entities/wip-posting.entity';
import { WipPostingType } from './enums/wip-posting-type.enum';

@Injectable()
export class ManufacturingWipAccountingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WipAccountingSettingsEntity)
    private readonly settingsRepository: Repository<WipAccountingSettingsEntity>,
    @InjectRepository(WipPostingEntity)
    private readonly postingRepository: Repository<WipPostingEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(AccountingSettingsEntity)
    private readonly accountingSettingsRepository: Repository<AccountingSettingsEntity>,
    @InjectRepository(MaterialConsumptionEntity)
    private readonly consumptionRepository: Repository<MaterialConsumptionEntity>,
    @InjectRepository(FinishedGoodsReceiptEntity)
    private readonly receiptRepository: Repository<FinishedGoodsReceiptEntity>,
    @InjectRepository(ProductionOrderEntity)
    private readonly productionOrderRepository: Repository<ProductionOrderEntity>,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  async getSettings(companyId: string): Promise<WipAccountingSettingsEntity> {
    const settings = await this.settingsRepository.findOne({ where: { companyId }, relations: { wipAccount: true } });
    if (!settings) throw new NotFoundException('Manufacturing WIP accounting settings are not configured.');
    return settings;
  }

  async upsertSettings(companyId: string, userId: string, dto: UpsertWipAccountingSettingsDto): Promise<WipAccountingSettingsEntity> {
    const account = await this.accountRepository.findOne({ where: { id: dto.wipAccountId, companyId } });
    if (!account) throw new NotFoundException('WIP account not found.');
    if (account.type !== AccountType.ASSET || account.isGroup || account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('WIP account must be an active posting ASSET account.');
    }
    const existing = await this.settingsRepository.findOne({ where: { companyId } });
    const entity = existing
      ? this.settingsRepository.merge(existing, { wipAccountId: dto.wipAccountId, updatedBy: userId })
      : this.settingsRepository.create({ companyId, wipAccountId: dto.wipAccountId, createdBy: userId, updatedBy: userId });
    await this.settingsRepository.save(entity);
    return this.getSettings(companyId);
  }

  async postMaterialConsumption(companyId: string, userId: string, consumptionId: string): Promise<WipPostingEntity> {
    const existing = await this.postingRepository.findOne({ where: { companyId, postingType: WipPostingType.MATERIAL_CONSUMPTION, sourceId: consumptionId } });
    if (existing) return existing;
    const consumption = await this.consumptionRepository.findOne({ where: { id: consumptionId, companyId }, relations: { lines: true, productionOrder: true } });
    if (!consumption) throw new NotFoundException('Material consumption not found.');
    if (consumption.status !== MaterialConsumptionStatus.POSTED) throw new BadRequestException('Only posted material consumption can be transferred to WIP.');
    const amount = this.money(consumption.lines.reduce((sum, line) => sum + Number(line.totalCost), 0));
    if (amount <= 0) throw new BadRequestException('Material consumption has no positive cost to post.');
    const { inventoryAccountId, wipAccountId } = await this.resolveAccounts(companyId);
    const journal = await this.journalEntriesService.create({
      entryDate: consumption.consumptionDate,
      sourceType: JournalEntrySourceType.OTHER,
      sourceId: consumption.id,
      referenceNumber: consumption.consumptionNumber,
      narration: `Material consumption transferred to WIP for production order ${consumption.productionOrder.orderNumber}`,
      lines: [
        { accountId: wipAccountId, debit: amount, credit: 0, description: `WIP - ${consumption.productionOrder.orderNumber}` },
        { accountId: inventoryAccountId, debit: 0, credit: amount, description: `Materials issued - ${consumption.consumptionNumber}` },
      ],
    }, companyId, userId);
    await this.journalEntriesService.post(journal.id, companyId, userId);
    try {
      return await this.postingRepository.save(this.postingRepository.create({ companyId, productionOrderId: consumption.productionOrderId, postingType: WipPostingType.MATERIAL_CONSUMPTION, sourceId: consumption.id, postingDate: consumption.consumptionDate, amount, journalEntryId: journal.id, createdBy: userId }));
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Material consumption has already been posted to WIP.');
      throw error;
    }
  }

  async postFinishedGoodsReceipt(companyId: string, userId: string, receiptId: string): Promise<WipPostingEntity> {
    const existing = await this.postingRepository.findOne({ where: { companyId, postingType: WipPostingType.FINISHED_GOODS_RECEIPT, sourceId: receiptId } });
    if (existing) return existing;
    const receipt = await this.receiptRepository.findOne({ where: { id: receiptId, companyId }, relations: { productionOrder: true } });
    if (!receipt) throw new NotFoundException('Finished-goods receipt not found.');
    if (receipt.status !== FinishedGoodsReceiptStatus.POSTED) throw new BadRequestException('Only posted finished-goods receipts can be transferred from WIP.');
    const amount = this.money(Number(receipt.totalCost));
    if (amount <= 0) throw new BadRequestException('Finished-goods receipt has no positive cost to post.');
    const { inventoryAccountId, wipAccountId } = await this.resolveAccounts(companyId);
    const availableWip = await this.getAvailableWip(companyId, receipt.productionOrderId);
    if (amount > availableWip + 0.01) throw new BadRequestException(`Receipt cost exceeds available WIP by ${(amount - availableWip).toFixed(2)}.`);
    const journal = await this.journalEntriesService.create({
      entryDate: receipt.receiptDate,
      sourceType: JournalEntrySourceType.OTHER,
      sourceId: receipt.id,
      referenceNumber: receipt.receiptNumber,
      narration: `Finished goods transferred from WIP for production order ${receipt.productionOrder.orderNumber}`,
      lines: [
        { accountId: inventoryAccountId, debit: amount, credit: 0, description: `Finished goods receipt - ${receipt.receiptNumber}` },
        { accountId: wipAccountId, debit: 0, credit: amount, description: `WIP released - ${receipt.productionOrder.orderNumber}` },
      ],
    }, companyId, userId);
    await this.journalEntriesService.post(journal.id, companyId, userId);
    try {
      return await this.postingRepository.save(this.postingRepository.create({ companyId, productionOrderId: receipt.productionOrderId, postingType: WipPostingType.FINISHED_GOODS_RECEIPT, sourceId: receipt.id, postingDate: receipt.receiptDate, amount, journalEntryId: journal.id, createdBy: userId }));
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Finished-goods receipt has already been posted from WIP.');
      throw error;
    }
  }

  async list(companyId: string, filter: WipPostingFilterDto) {
    const [data, total] = await this.postingRepository.findAndCount({
      where: { companyId, ...(filter.productionOrderId ? { productionOrderId: filter.productionOrderId } : {}), ...(filter.postingType ? { postingType: filter.postingType } : {}) },
      relations: { productionOrder: true, journalEntry: true },
      order: { postingDate: 'DESC', createdAt: 'DESC' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async getProductionOrderSummary(companyId: string, productionOrderId: string) {
    const order = await this.productionOrderRepository.findOne({ where: { id: productionOrderId, companyId } });
    if (!order) throw new NotFoundException('Production order not found.');
    const raw = await this.postingRepository.createQueryBuilder('posting')
      .select("COALESCE(SUM(CASE WHEN posting.posting_type = :consumption THEN posting.amount ELSE 0 END), 0)", 'materialCost')
      .addSelect("COALESCE(SUM(CASE WHEN posting.posting_type = :receipt THEN posting.amount ELSE 0 END), 0)", 'finishedGoodsCost')
      .where('posting.company_id = :companyId', { companyId })
      .andWhere('posting.production_order_id = :productionOrderId', { productionOrderId })
      .setParameters({ consumption: WipPostingType.MATERIAL_CONSUMPTION, receipt: WipPostingType.FINISHED_GOODS_RECEIPT })
      .getRawOne<{ materialCost: string; finishedGoodsCost: string }>();
    const materialCost = this.money(Number(raw?.materialCost ?? 0));
    const finishedGoodsCost = this.money(Number(raw?.finishedGoodsCost ?? 0));
    return { productionOrderId, orderNumber: order.orderNumber, materialCost, finishedGoodsCost, openWip: this.money(materialCost - finishedGoodsCost) };
  }

  private async resolveAccounts(companyId: string): Promise<{ inventoryAccountId: string; wipAccountId: string }> {
    const accounting = await this.accountingSettingsRepository.findOne({ where: { companyId } });
    if (!accounting?.inventoryAccountId) throw new BadRequestException('Inventory account is not configured in accounting settings.');
    const wip = await this.getSettings(companyId);
    return { inventoryAccountId: accounting.inventoryAccountId, wipAccountId: wip.wipAccountId };
  }

  private async getAvailableWip(companyId: string, productionOrderId: string): Promise<number> {
    const raw = await this.postingRepository.createQueryBuilder('posting')
      .select("COALESCE(SUM(CASE WHEN posting.posting_type = :consumption THEN posting.amount ELSE -posting.amount END), 0)", 'amount')
      .where('posting.company_id = :companyId', { companyId })
      .andWhere('posting.production_order_id = :productionOrderId', { productionOrderId })
      .setParameter('consumption', WipPostingType.MATERIAL_CONSUMPTION)
      .getRawOne<{ amount: string }>();
    return this.money(Number(raw?.amount ?? 0));
  }

  private money(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
  private isUniqueViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'; }
}
