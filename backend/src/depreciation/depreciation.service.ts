import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { AssetStatus } from '../asset-management/enums/asset-status.enum';
import { FixedAssetEntity } from '../asset-management/entities/fixed-asset.entity';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { calculateDepreciation } from './depreciation-calculator';
import { CreateDepreciationRunDto } from './dto/create-depreciation-run.dto';
import { DepreciationRunFilterDto } from './dto/depreciation-run-filter.dto';
import { DepreciationEntryEntity } from './entities/depreciation-entry.entity';
import { DepreciationRunEntity } from './entities/depreciation-run.entity';
import { DepreciationRunStatus } from './enums/depreciation-run-status.enum';

@Injectable()
export class DepreciationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DepreciationRunEntity) private readonly runRepository: Repository<DepreciationRunEntity>,
    @InjectRepository(DepreciationEntryEntity) private readonly entryRepository: Repository<DepreciationEntryEntity>,
    @InjectRepository(FixedAssetEntity) private readonly assetRepository: Repository<FixedAssetEntity>,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  async preview(companyId: string, periodEnd: string) {
    const entries = await this.calculateEntries(companyId, periodEnd);
    return { periodEnd, assetCount: entries.length, totalAmount: this.round(entries.reduce((sum, entry) => sum + Number(entry.depreciationAmount), 0)), entries };
  }

  async createRun(companyId: string, userId: string, dto: CreateDepreciationRunDto): Promise<DepreciationRunEntity> {
    if (dto.postingDate < dto.periodEnd) throw new BadRequestException('Posting date cannot be before period end.');
    const existing = await this.runRepository.findOne({ where: { companyId, periodEnd: dto.periodEnd } });
    if (existing) throw new ConflictException('A depreciation run already exists for this period.');
    const calculatedEntries = await this.calculateEntries(companyId, dto.periodEnd);
    if (calculatedEntries.length === 0) throw new BadRequestException('No depreciation is due for the selected period.');
    return this.dataSource.transaction(async (manager) => {
      const runRepo = manager.getRepository(DepreciationRunEntity);
      const entryRepo = manager.getRepository(DepreciationEntryEntity);
      const run = await runRepo.save(runRepo.create({ companyId, periodEnd: dto.periodEnd, postingDate: dto.postingDate, status: DepreciationRunStatus.DRAFT, totalAmount: this.money(calculatedEntries.reduce((sum, entry) => sum + Number(entry.depreciationAmount), 0)), journalEntryId: null, createdBy: userId, postedBy: null, postedAt: null, entries: [] }));
      const entries = calculatedEntries.map((entry) => entryRepo.create({ ...entry, runId: run.id, companyId }));
      run.entries = await entryRepo.save(entries);
      return run;
    });
  }

  async postRun(companyId: string, userId: string, id: string): Promise<DepreciationRunEntity> {
    const run = await this.runRepository.findOne({ where: { id, companyId }, relations: { entries: { asset: true } } });
    if (!run) throw new NotFoundException('Depreciation run not found.');
    if (run.status === DepreciationRunStatus.POSTED) return run;
    if (run.entries.length === 0) throw new BadRequestException('Depreciation run has no entries.');
    const grouped = new Map<string, { expenseAccountId: string; accumulatedAccountId: string; amount: number }>();
    for (const entry of run.entries) {
      const key = `${entry.expenseAccountId}:${entry.accumulatedDepreciationAccountId}`;
      const current = grouped.get(key) ?? { expenseAccountId: entry.expenseAccountId, accumulatedAccountId: entry.accumulatedDepreciationAccountId, amount: 0 };
      current.amount = this.round(current.amount + Number(entry.depreciationAmount));
      grouped.set(key, current);
    }
    const lines = Array.from(grouped.values()).flatMap((group) => [
      { accountId: group.expenseAccountId, debit: group.amount, credit: 0, description: `Depreciation expense through ${run.periodEnd}` },
      { accountId: group.accumulatedAccountId, debit: 0, credit: group.amount, description: `Accumulated depreciation through ${run.periodEnd}` },
    ]);
    const journal = await this.journalEntriesService.create({ entryDate: run.postingDate, sourceType: JournalEntrySourceType.OTHER, sourceId: run.id, referenceNumber: `DEP-${run.periodEnd}`, narration: `Depreciation run through ${run.periodEnd}`, lines }, companyId, userId);
    await this.journalEntriesService.post(journal.id, companyId, userId);
    await this.dataSource.transaction(async (manager) => {
      const lockedRun = await manager.getRepository(DepreciationRunEntity).findOne({ where: { id, companyId }, lock: { mode: 'pessimistic_write' } });
      if (!lockedRun) throw new NotFoundException('Depreciation run not found.');
      lockedRun.status = DepreciationRunStatus.POSTED;
      lockedRun.journalEntryId = journal.id;
      lockedRun.postedBy = userId;
      lockedRun.postedAt = new Date();
      await manager.getRepository(DepreciationRunEntity).save(lockedRun);
      const assetRepo = manager.getRepository(FixedAssetEntity);
      for (const entry of run.entries) {
        if (Number(entry.closingNetBookValue) <= Number(entry.asset.residualValue)) {
          await assetRepo.update({ id: entry.assetId, companyId }, { status: AssetStatus.FULLY_DEPRECIATED, updatedBy: userId });
        }
      }
    });
    return this.getRun(companyId, id);
  }

  async listRuns(companyId: string, filter: DepreciationRunFilterDto) {
    const [data, total] = await this.runRepository.findAndCount({ where: { companyId, ...(filter.status ? { status: filter.status } : {}) }, order: { periodEnd: 'DESC' }, skip: (filter.page - 1) * filter.limit, take: filter.limit });
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async getRun(companyId: string, id: string): Promise<DepreciationRunEntity> {
    const run = await this.runRepository.findOne({ where: { id, companyId }, relations: { entries: { asset: true } } });
    if (!run) throw new NotFoundException('Depreciation run not found.');
    return run;
  }

  private async calculateEntries(companyId: string, periodEnd: string): Promise<Array<Partial<DepreciationEntryEntity> & { asset: FixedAssetEntity }>> {
    const assets = await this.assetRepository.find({ where: { companyId, status: AssetStatus.ACTIVE, depreciationStartDate: LessThanOrEqual(periodEnd) }, relations: { category: true }, order: { assetNumber: 'ASC' } });
    const result: Array<Partial<DepreciationEntryEntity> & { asset: FixedAssetEntity }> = [];
    for (const asset of assets) {
      const prior = await this.entryRepository.createQueryBuilder('entry').innerJoin('entry.run', 'run').select('COALESCE(SUM(entry.depreciation_amount), 0)', 'amount').addSelect('MAX(run.period_end)', 'lastPeriodEnd').where('entry.company_id = :companyId', { companyId }).andWhere('entry.asset_id = :assetId', { assetId: asset.id }).andWhere('run.status = :status', { status: DepreciationRunStatus.POSTED }).andWhere('run.period_end <= :periodEnd', { periodEnd }).getRawOne<{ amount: string; lastPeriodEnd: string | null }>();
      const openingAccumulated = Number(prior?.amount ?? 0);
      const fromDate = prior?.lastPeriodEnd ? this.nextMonth(prior.lastPeriodEnd) : asset.depreciationStartDate;
      const months = this.monthsInclusive(fromDate, periodEnd);
      const calculation = calculateDepreciation({ acquisitionCost: Number(asset.acquisitionCost), residualValue: Number(asset.residualValue), usefulLifeMonths: asset.usefulLifeMonths, method: asset.category.depreciationMethod, decliningBalanceRate: asset.category.decliningBalanceRate === null ? null : Number(asset.category.decliningBalanceRate), openingAccumulatedDepreciation: openingAccumulated, monthsToDepreciate: months });
      if (calculation.amount <= 0) continue;
      result.push({ asset, assetId: asset.id, monthsDepreciated: months, openingAccumulatedDepreciation: this.money(openingAccumulated), depreciationAmount: this.money(calculation.amount), closingAccumulatedDepreciation: this.money(calculation.closingAccumulatedDepreciation), openingNetBookValue: this.money(Number(asset.acquisitionCost) - openingAccumulated), closingNetBookValue: this.money(calculation.closingNetBookValue), expenseAccountId: asset.category.depreciationExpenseAccountId, accumulatedDepreciationAccountId: asset.category.accumulatedDepreciationAccountId });
    }
    return result;
  }

  private monthsInclusive(fromDate: string, toDate: string): number {
    const from = new Date(`${fromDate}T00:00:00Z`); const to = new Date(`${toDate}T00:00:00Z`);
    if (from > to) return 0;
    return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1;
  }
  private nextMonth(date: string): string { const value = new Date(`${date}T00:00:00Z`); value.setUTCMonth(value.getUTCMonth() + 1, 1); return value.toISOString().slice(0, 10); }
  private round(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
  private money(value: number): string { return this.round(value).toFixed(2); }
}
