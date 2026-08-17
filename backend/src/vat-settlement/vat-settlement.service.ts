import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { VatReturnStatus } from '../vat-engine/enums/vat-return-status.enum';
import { VatReturnEntity } from '../vat-engine/entities/vat-return.entity';
import { CreateVatSettlementDto } from './dto/create-vat-settlement.dto';
import { UpsertVatSettlementSettingsDto } from './dto/upsert-vat-settlement-settings.dto';
import { VatSettlementFilterDto } from './dto/vat-settlement-filter.dto';
import { VatSettlementSettingsEntity } from './entities/vat-settlement-settings.entity';
import { VatSettlementEntity } from './entities/vat-settlement.entity';
import { VatSettlementStatus } from './enums/vat-settlement-status.enum';

@Injectable()
export class VatSettlementService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(VatSettlementSettingsEntity) private readonly settingsRepository: Repository<VatSettlementSettingsEntity>,
    @InjectRepository(VatSettlementEntity) private readonly settlementRepository: Repository<VatSettlementEntity>,
    @InjectRepository(AccountEntity) private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(VatReturnEntity) private readonly vatReturnRepository: Repository<VatReturnEntity>,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  async getSettings(companyId: string): Promise<VatSettlementSettingsEntity> {
    const settings = await this.settingsRepository.findOne({ where: { companyId } });
    if (!settings) throw new NotFoundException('VAT settlement settings are not configured.');
    return settings;
  }

  async upsertSettings(companyId: string, userId: string, dto: UpsertVatSettlementSettingsDto): Promise<VatSettlementSettingsEntity> {
    await this.validateAccounts(companyId, dto);
    const existing = await this.settingsRepository.findOne({ where: { companyId } });
    const entity = existing ?? this.settingsRepository.create({ companyId, createdBy: userId });
    entity.outputVatAccountId = dto.outputVatAccountId;
    entity.inputVatAccountId = dto.inputVatAccountId;
    entity.vatPayableAccountId = dto.vatPayableAccountId;
    entity.vatReceivableAccountId = dto.vatReceivableAccountId;
    entity.updatedBy = userId;
    return this.settingsRepository.save(entity);
  }

  async create(companyId: string, userId: string, dto: CreateVatSettlementDto): Promise<VatSettlementEntity> {
    const vatReturn = await this.vatReturnRepository.findOne({ where: { id: dto.vatReturnId, companyId } });
    if (!vatReturn) throw new NotFoundException('VAT return not found.');
    if (vatReturn.status !== VatReturnStatus.FINALIZED) throw new BadRequestException('Only finalized VAT returns can be settled.');
    if (dto.settlementDate < vatReturn.periodEnd) throw new BadRequestException('Settlement date cannot be before the VAT return period end.');
    const duplicate = await this.settlementRepository.findOne({ where: { companyId, vatReturnId: vatReturn.id } });
    if (duplicate) throw new ConflictException('This VAT return already has a settlement record.');
    await this.getSettings(companyId);
    return this.settlementRepository.save(this.settlementRepository.create({
      companyId,
      vatReturnId: vatReturn.id,
      settlementDate: dto.settlementDate,
      currency: (dto.currency ?? 'EUR').toUpperCase(),
      outputTax: this.round(vatReturn.outputTax),
      inputTax: this.round(vatReturn.inputTax),
      netTaxPayable: this.round(vatReturn.netTaxPayable),
      status: VatSettlementStatus.DRAFT,
      journalEntryId: null,
      notes: dto.notes?.trim() || null,
      createdBy: userId,
      postedBy: null,
      postedAt: null,
    }));
  }

  async post(companyId: string, userId: string, id: string): Promise<VatSettlementEntity> {
    const settlement = await this.settlementRepository.findOne({ where: { id, companyId }, relations: { vatReturn: true } });
    if (!settlement) throw new NotFoundException('VAT settlement not found.');
    if (settlement.status === VatSettlementStatus.POSTED) return settlement;
    if (settlement.vatReturn.status !== VatReturnStatus.FINALIZED) throw new BadRequestException('The related VAT return is not finalized.');
    if (this.round(settlement.outputTax) !== this.round(settlement.vatReturn.outputTax) || this.round(settlement.inputTax) !== this.round(settlement.vatReturn.inputTax) || this.round(settlement.netTaxPayable) !== this.round(settlement.vatReturn.netTaxPayable)) {
      throw new ConflictException('VAT return totals changed after settlement creation. Recreate the settlement.');
    }
    const settings = await this.getSettings(companyId);
    const lines = this.buildJournalLines(settlement, settings);
    if (lines.length === 0) {
      await this.markPosted(companyId, userId, id, null);
      return this.findOne(companyId, id);
    }
    const journal = await this.journalEntriesService.create({
      entryDate: settlement.settlementDate,
      sourceType: JournalEntrySourceType.OTHER,
      sourceId: settlement.id,
      referenceNumber: `VAT-${settlement.vatReturn.periodStart}-${settlement.vatReturn.periodEnd}`,
      currency: settlement.currency,
      narration: `VAT settlement for ${settlement.vatReturn.periodStart} to ${settlement.vatReturn.periodEnd}`,
      lines,
    }, companyId, userId);
    await this.journalEntriesService.post(journal.id, companyId, userId);
    await this.markPosted(companyId, userId, id, journal.id);
    return this.findOne(companyId, id);
  }

  async findAll(companyId: string, filter: VatSettlementFilterDto) {
    const query = this.settlementRepository.createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.vatReturn', 'vatReturn')
      .where('settlement.company_id = :companyId', { companyId });
    if (filter.status) query.andWhere('settlement.status = :status', { status: filter.status });
    if (filter.dateFrom) query.andWhere('settlement.settlement_date >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) query.andWhere('settlement.settlement_date <= :dateTo', { dateTo: filter.dateTo });
    query.orderBy('settlement.settlement_date', 'DESC').addOrderBy('settlement.created_at', 'DESC').skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(companyId: string, id: string): Promise<VatSettlementEntity> {
    const settlement = await this.settlementRepository.findOne({ where: { id, companyId }, relations: { vatReturn: true } });
    if (!settlement) throw new NotFoundException('VAT settlement not found.');
    return settlement;
  }

  private buildJournalLines(settlement: VatSettlementEntity, settings: VatSettlementSettingsEntity) {
    const outputTax = this.round(settlement.outputTax);
    const inputTax = this.round(settlement.inputTax);
    const net = this.round(settlement.netTaxPayable);
    const lines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];
    if (outputTax > 0) lines.push({ accountId: settings.outputVatAccountId, debit: outputTax, credit: 0, description: 'Clear output VAT for finalized return' });
    if (inputTax > 0) lines.push({ accountId: settings.inputVatAccountId, debit: 0, credit: inputTax, description: 'Clear input VAT for finalized return' });
    if (net > 0) lines.push({ accountId: settings.vatPayableAccountId, debit: 0, credit: net, description: 'Recognize VAT payable to tax authority' });
    if (net < 0) lines.push({ accountId: settings.vatReceivableAccountId, debit: Math.abs(net), credit: 0, description: 'Recognize VAT recoverable from tax authority' });
    const debit = this.round(lines.reduce((sum, line) => sum + line.debit, 0));
    const credit = this.round(lines.reduce((sum, line) => sum + line.credit, 0));
    if (debit !== credit) throw new BadRequestException(`VAT settlement journal is not balanced: debit ${debit}, credit ${credit}.`);
    return lines;
  }

  private async markPosted(companyId: string, userId: string, id: string, journalEntryId: string | null): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(VatSettlementEntity);
      const locked = await repository.findOne({ where: { id, companyId }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new NotFoundException('VAT settlement not found.');
      if (locked.status === VatSettlementStatus.POSTED) return;
      locked.status = VatSettlementStatus.POSTED;
      locked.journalEntryId = journalEntryId;
      locked.postedBy = userId;
      locked.postedAt = new Date();
      await repository.save(locked);
    });
  }

  private async validateAccounts(companyId: string, dto: UpsertVatSettlementSettingsDto): Promise<void> {
    const accountIds = [dto.outputVatAccountId, dto.inputVatAccountId, dto.vatPayableAccountId, dto.vatReceivableAccountId];
    if (new Set(accountIds).size !== accountIds.length) throw new BadRequestException('VAT settlement accounts must be distinct.');
    const accounts = await this.accountRepository.find({ where: { id: In(accountIds) } });
    const byId = new Map(accounts.map((account) => [account.id, account]));
    this.assertAccount(byId.get(dto.outputVatAccountId), companyId, AccountType.LIABILITY, 'Output VAT');
    this.assertAccount(byId.get(dto.inputVatAccountId), companyId, AccountType.ASSET, 'Input VAT');
    this.assertAccount(byId.get(dto.vatPayableAccountId), companyId, AccountType.LIABILITY, 'VAT payable');
    this.assertAccount(byId.get(dto.vatReceivableAccountId), companyId, AccountType.ASSET, 'VAT receivable');
  }

  private assertAccount(account: AccountEntity | undefined, companyId: string, type: AccountType, label: string): void {
    if (!account || account.companyId !== companyId) throw new BadRequestException(`${label} account was not found for this company.`);
    if (account.type !== type) throw new BadRequestException(`${label} account must be an ${type} account.`);
    if (account.status !== AccountStatus.ACTIVE || account.isGroup) throw new BadRequestException(`${label} account must be an active posting account.`);
  }

  private round(value: number): number { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
}
