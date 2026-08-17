import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { AssetStatus } from '../asset-management/enums/asset-status.enum';
import { FixedAssetEntity } from '../asset-management/entities/fixed-asset.entity';
import { DepreciationEntryEntity } from '../depreciation/entities/depreciation-entry.entity';
import { DepreciationRunStatus } from '../depreciation/enums/depreciation-run-status.enum';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { AssetDisposalFilterDto } from './dto/asset-disposal-filter.dto';
import { CreateAssetDisposalDto } from './dto/create-asset-disposal.dto';
import { AssetDisposalEntity } from './entities/asset-disposal.entity';
import { AssetDisposalStatus } from './enums/asset-disposal-status.enum';

@Injectable()
export class AssetDisposalService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AssetDisposalEntity) private readonly disposalRepo: Repository<AssetDisposalEntity>,
    @InjectRepository(FixedAssetEntity) private readonly assetRepo: Repository<FixedAssetEntity>,
    @InjectRepository(AccountEntity) private readonly accountRepo: Repository<AccountEntity>,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateAssetDisposalDto): Promise<AssetDisposalEntity> {
    const asset = await this.assetRepo.findOne({ where: { id: dto.assetId, companyId }, relations: { category: true } });
    if (!asset) throw new NotFoundException('Fixed asset not found.');
    if (![AssetStatus.ACTIVE, AssetStatus.FULLY_DEPRECIATED, AssetStatus.INACTIVE].includes(asset.status)) throw new ConflictException('Only active, inactive, or fully depreciated assets can be disposed.');
    if (dto.disposalDate < asset.acquisitionDate) throw new BadRequestException('Disposal date cannot be before acquisition date.');
    if (dto.disposalProceeds > 0 && !dto.proceedsAccountId) throw new BadRequestException('Proceeds account is required when disposal proceeds are greater than zero.');
    await this.validateAccounts(companyId, dto.proceedsAccountId, dto.gainAccountId, dto.lossAccountId);
    const existing = await this.disposalRepo.exists({ where: { assetId: asset.id } });
    if (existing) throw new ConflictException('A disposal already exists for this asset.');
    const accumulated = await this.getPostedDepreciation(companyId, asset.id, dto.disposalDate);
    const cost = Number(asset.acquisitionCost);
    const netBookValue = this.round(Math.max(0, cost - accumulated));
    const gain = this.round(Math.max(0, dto.disposalProceeds - netBookValue));
    const loss = this.round(Math.max(0, netBookValue - dto.disposalProceeds));
    return this.disposalRepo.save(this.disposalRepo.create({
      companyId, assetId: asset.id, disposalDate: dto.disposalDate, disposalProceeds: this.money(dto.disposalProceeds),
      accumulatedDepreciation: this.money(accumulated), netBookValue: this.money(netBookValue), gainAmount: this.money(gain), lossAmount: this.money(loss),
      proceedsAccountId: dto.proceedsAccountId ?? null, gainAccountId: dto.gainAccountId, lossAccountId: dto.lossAccountId,
      status: AssetDisposalStatus.DRAFT, journalEntryId: null, notes: this.optional(dto.notes), createdBy: userId, postedBy: null, postedAt: null,
    }));
  }

  async post(companyId: string, userId: string, id: string): Promise<AssetDisposalEntity> {
    const disposal = await this.disposalRepo.findOne({ where: { id, companyId }, relations: { asset: { category: true } } });
    if (!disposal) throw new NotFoundException('Asset disposal not found.');
    if (disposal.status === AssetDisposalStatus.POSTED) return disposal;
    const latestAccumulated = await this.getPostedDepreciation(companyId, disposal.assetId, disposal.disposalDate);
    if (this.round(latestAccumulated) !== this.round(Number(disposal.accumulatedDepreciation))) throw new ConflictException('Depreciation changed after the disposal draft was created. Recreate the disposal.');
    const cost = this.round(Number(disposal.asset.acquisitionCost));
    const accumulated = this.round(Number(disposal.accumulatedDepreciation));
    const proceeds = this.round(Number(disposal.disposalProceeds));
    const gain = this.round(Number(disposal.gainAmount));
    const loss = this.round(Number(disposal.lossAmount));
    const lines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];
    if (proceeds > 0 && disposal.proceedsAccountId) lines.push({ accountId: disposal.proceedsAccountId, debit: proceeds, credit: 0, description: `Asset disposal proceeds - ${disposal.asset.assetNumber}` });
    if (accumulated > 0) lines.push({ accountId: disposal.asset.category.accumulatedDepreciationAccountId, debit: accumulated, credit: 0, description: `Remove accumulated depreciation - ${disposal.asset.assetNumber}` });
    if (loss > 0) lines.push({ accountId: disposal.lossAccountId, debit: loss, credit: 0, description: `Loss on asset disposal - ${disposal.asset.assetNumber}` });
    lines.push({ accountId: disposal.asset.category.assetAccountId, debit: 0, credit: cost, description: `Remove asset cost - ${disposal.asset.assetNumber}` });
    if (gain > 0) lines.push({ accountId: disposal.gainAccountId, debit: 0, credit: gain, description: `Gain on asset disposal - ${disposal.asset.assetNumber}` });
    const journal = await this.journalEntriesService.create({ entryDate: disposal.disposalDate, sourceType: JournalEntrySourceType.OTHER, sourceId: disposal.id, referenceNumber: `DISP-${disposal.asset.assetNumber}`, narration: `Disposal of fixed asset ${disposal.asset.assetNumber}`, lines }, companyId, userId);
    await this.journalEntriesService.post(journal.id, companyId, userId);
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AssetDisposalEntity);
      const locked = await repo.findOne({ where: { id, companyId }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new NotFoundException('Asset disposal not found.');
      if (locked.status === AssetDisposalStatus.POSTED) return;
      locked.status = AssetDisposalStatus.POSTED; locked.journalEntryId = journal.id; locked.postedBy = userId; locked.postedAt = new Date();
      await repo.save(locked);
      await manager.getRepository(FixedAssetEntity).update({ id: locked.assetId, companyId }, { status: AssetStatus.DISPOSED, disposalDate: locked.disposalDate, disposalProceeds: locked.disposalProceeds, updatedBy: userId });
    });
    return this.get(companyId, id);
  }

  async list(companyId: string, filter: AssetDisposalFilterDto) {
    const [data, total] = await this.disposalRepo.findAndCount({ where: { companyId, ...(filter.status ? { status: filter.status } : {}), ...(filter.assetId ? { assetId: filter.assetId } : {}) }, relations: { asset: true }, order: { disposalDate: 'DESC', createdAt: 'DESC' }, skip: (filter.page - 1) * filter.limit, take: filter.limit });
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async get(companyId: string, id: string): Promise<AssetDisposalEntity> {
    const entity = await this.disposalRepo.findOne({ where: { id, companyId }, relations: { asset: { category: true } } });
    if (!entity) throw new NotFoundException('Asset disposal not found.');
    return entity;
  }

  private async getPostedDepreciation(companyId: string, assetId: string, disposalDate: string): Promise<number> {
    const row = await this.dataSource.getRepository(DepreciationEntryEntity).createQueryBuilder('entry').innerJoin('entry.run', 'run').select('COALESCE(SUM(entry.depreciation_amount), 0)', 'amount').where('entry.company_id = :companyId', { companyId }).andWhere('entry.asset_id = :assetId', { assetId }).andWhere('run.status = :status', { status: DepreciationRunStatus.POSTED }).andWhere('run.period_end <= :disposalDate', { disposalDate }).getRawOne<{ amount: string }>();
    return this.round(Number(row?.amount ?? 0));
  }

  private async validateAccounts(companyId: string, proceedsId: string | undefined, gainId: string, lossId: string): Promise<void> {
    const ids = [gainId, lossId, ...(proceedsId ? [proceedsId] : [])];
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Disposal accounts must be different.');
    const accounts = await this.accountRepo.findBy(ids.map((id) => ({ id, companyId })));
    if (accounts.length !== ids.length) throw new BadRequestException('One or more disposal accounts are invalid.');
    for (const account of accounts) if (account.status !== AccountStatus.ACTIVE || account.isGroup) throw new BadRequestException(`Account ${account.code} must be an active posting account.`);
    if (accounts.find((x) => x.id === gainId)?.type !== AccountType.INCOME) throw new BadRequestException('Gain account must be an income account.');
    if (accounts.find((x) => x.id === lossId)?.type !== AccountType.EXPENSE) throw new BadRequestException('Loss account must be an expense account.');
    if (proceedsId && accounts.find((x) => x.id === proceedsId)?.type !== AccountType.ASSET) throw new BadRequestException('Proceeds account must be an asset account.');
  }
  private round(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
  private money(value: number): string { return this.round(value).toFixed(2); }
  private optional(value?: string): string | null { const normalized = value?.trim(); return normalized ? normalized : null; }
}
