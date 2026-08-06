import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { AssetFilterDto } from './dto/asset-filter.dto';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { AssetCategoryEntity } from './entities/asset-category.entity';
import { FixedAssetEntity } from './entities/fixed-asset.entity';
import { AssetStatus } from './enums/asset-status.enum';
import { DepreciationMethod } from './enums/depreciation-method.enum';

@Injectable()
export class AssetManagementService {
  constructor(
    @InjectRepository(AssetCategoryEntity) private readonly categoryRepo: Repository<AssetCategoryEntity>,
    @InjectRepository(FixedAssetEntity) private readonly assetRepo: Repository<FixedAssetEntity>,
    @InjectRepository(AccountEntity) private readonly accountRepo: Repository<AccountEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createCategory(companyId: string, userId: string, dto: CreateAssetCategoryDto): Promise<AssetCategoryEntity> {
    await this.validateCategoryAccounts(companyId, dto.assetAccountId, dto.accumulatedDepreciationAccountId, dto.depreciationExpenseAccountId);
    this.validateDecliningRate(dto.depreciationMethod, dto.decliningBalanceRate);
    const existing = await this.categoryRepo.exists({ where: { companyId, code: dto.code.trim().toUpperCase() } });
    if (existing) throw new ConflictException('Asset category code already exists');
    const entity = this.categoryRepo.create({
      companyId, code: dto.code.trim().toUpperCase(), name: dto.name.trim(), description: this.optional(dto.description),
      assetAccountId: dto.assetAccountId, accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId,
      depreciationExpenseAccountId: dto.depreciationExpenseAccountId, depreciationMethod: dto.depreciationMethod,
      defaultUsefulLifeMonths: dto.defaultUsefulLifeMonths,
      decliningBalanceRate: dto.decliningBalanceRate === undefined ? null : dto.decliningBalanceRate.toFixed(4),
      isActive: dto.isActive ?? true, createdBy: userId, updatedBy: userId,
    });
    return this.categoryRepo.save(entity);
  }

  async listCategories(companyId: string): Promise<AssetCategoryEntity[]> {
    return this.categoryRepo.find({ where: { companyId }, order: { code: 'ASC' } });
  }

  async updateCategory(companyId: string, userId: string, id: string, dto: UpdateAssetCategoryDto): Promise<AssetCategoryEntity> {
    const entity = await this.getCategory(companyId, id);
    const assetAccountId = dto.assetAccountId ?? entity.assetAccountId;
    const accumulatedId = dto.accumulatedDepreciationAccountId ?? entity.accumulatedDepreciationAccountId;
    const expenseId = dto.depreciationExpenseAccountId ?? entity.depreciationExpenseAccountId;
    await this.validateCategoryAccounts(companyId, assetAccountId, accumulatedId, expenseId);
    const method = dto.depreciationMethod ?? entity.depreciationMethod;
    const rate = dto.decliningBalanceRate ?? (entity.decliningBalanceRate === null ? undefined : Number(entity.decliningBalanceRate));
    this.validateDecliningRate(method, rate);
    if (dto.code !== undefined) entity.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.description !== undefined) entity.description = this.optional(dto.description);
    entity.assetAccountId = assetAccountId; entity.accumulatedDepreciationAccountId = accumulatedId; entity.depreciationExpenseAccountId = expenseId;
    entity.depreciationMethod = method;
    if (dto.defaultUsefulLifeMonths !== undefined) entity.defaultUsefulLifeMonths = dto.defaultUsefulLifeMonths;
    entity.decliningBalanceRate = method === DepreciationMethod.DECLINING_BALANCE && rate !== undefined ? rate.toFixed(4) : null;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;
    entity.updatedBy = userId;
    return this.categoryRepo.save(entity);
  }

  async removeCategory(companyId: string, id: string): Promise<{ message: string }> {
    const category = await this.getCategory(companyId, id);
    const used = await this.assetRepo.exists({ where: { companyId, categoryId: id } });
    if (used) throw new ConflictException('Asset category is used by one or more assets');
    await this.categoryRepo.softRemove(category);
    return { message: 'Asset category deleted successfully' };
  }

  async createAsset(companyId: string, userId: string, dto: CreateFixedAssetDto): Promise<FixedAssetEntity> {
    const category = await this.getCategory(companyId, dto.categoryId);
    if (!category.isActive) throw new BadRequestException('Asset category is inactive');
    this.validateAssetValues(dto.acquisitionCost, dto.residualValue ?? 0, dto.acquisitionDate, dto.depreciationStartDate);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FixedAssetEntity);
      const assetNumber = await this.generateAssetNumber(companyId, repo);
      return repo.save(repo.create({
        companyId, assetNumber, name: dto.name.trim(), description: this.optional(dto.description), categoryId: category.id,
        acquisitionDate: dto.acquisitionDate, depreciationStartDate: dto.depreciationStartDate,
        acquisitionCost: dto.acquisitionCost.toFixed(4), residualValue: (dto.residualValue ?? 0).toFixed(4),
        usefulLifeMonths: dto.usefulLifeMonths ?? category.defaultUsefulLifeMonths,
        serialNumber: this.optional(dto.serialNumber), location: this.optional(dto.location), custodian: this.optional(dto.custodian),
        status: AssetStatus.DRAFT, activationDate: null, disposalDate: null, disposalProceeds: null,
        createdBy: userId, updatedBy: userId,
      }));
    });
  }

  async listAssets(companyId: string, filter: AssetFilterDto): Promise<{ data: FixedAssetEntity[]; meta: Record<string, number | boolean> }> {
    const page = filter.page ?? 1; const limit = filter.limit ?? 20;
    const qb = this.assetRepo.createQueryBuilder('asset').leftJoinAndSelect('asset.category', 'category').where('asset.company_id = :companyId', { companyId });
    if (filter.search?.trim()) { const search = `%${filter.search.trim()}%`; qb.andWhere(new Brackets((b) => b.where('asset.asset_number ILIKE :search', { search }).orWhere('asset.name ILIKE :search', { search }).orWhere('asset.serial_number ILIKE :search', { search }))); }
    if (filter.categoryId) qb.andWhere('asset.category_id = :categoryId', { categoryId: filter.categoryId });
    if (filter.status) qb.andWhere('asset.status = :status', { status: filter.status });
    if (filter.isActiveCategory !== undefined) qb.andWhere('category.is_active = :isActiveCategory', { isActiveCategory: filter.isActiveCategory });
    qb.orderBy('asset.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount(); const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
  }

  async getAsset(companyId: string, id: string): Promise<FixedAssetEntity> {
    const entity = await this.assetRepo.findOne({ where: { companyId, id }, relations: { category: true } });
    if (!entity) throw new NotFoundException('Fixed asset not found');
    return entity;
  }

  async updateAsset(companyId: string, userId: string, id: string, dto: UpdateFixedAssetDto): Promise<FixedAssetEntity> {
    const asset = await this.getAsset(companyId, id);
    if (asset.status !== AssetStatus.DRAFT) throw new ConflictException('Only draft assets can be edited');
    const category = dto.categoryId ? await this.getCategory(companyId, dto.categoryId) : asset.category;
    if (!category.isActive) throw new BadRequestException('Asset category is inactive');
    const acquisitionCost = dto.acquisitionCost ?? Number(asset.acquisitionCost); const residualValue = dto.residualValue ?? Number(asset.residualValue);
    const acquisitionDate = dto.acquisitionDate ?? asset.acquisitionDate; const depreciationStartDate = dto.depreciationStartDate ?? asset.depreciationStartDate;
    this.validateAssetValues(acquisitionCost, residualValue, acquisitionDate, depreciationStartDate);
    if (dto.name !== undefined) asset.name = dto.name.trim(); if (dto.description !== undefined) asset.description = this.optional(dto.description);
    asset.categoryId = category.id; asset.acquisitionDate = acquisitionDate; asset.depreciationStartDate = depreciationStartDate;
    asset.acquisitionCost = acquisitionCost.toFixed(4); asset.residualValue = residualValue.toFixed(4);
    if (dto.usefulLifeMonths !== undefined) asset.usefulLifeMonths = dto.usefulLifeMonths;
    if (dto.serialNumber !== undefined) asset.serialNumber = this.optional(dto.serialNumber); if (dto.location !== undefined) asset.location = this.optional(dto.location); if (dto.custodian !== undefined) asset.custodian = this.optional(dto.custodian);
    asset.updatedBy = userId; return this.assetRepo.save(asset);
  }

  async activateAsset(companyId: string, userId: string, id: string): Promise<FixedAssetEntity> {
    const asset = await this.getAsset(companyId, id);
    if (asset.status !== AssetStatus.DRAFT && asset.status !== AssetStatus.INACTIVE) throw new ConflictException('Only draft or inactive assets can be activated');
    asset.status = AssetStatus.ACTIVE; asset.activationDate = asset.activationDate ?? new Date().toISOString().slice(0, 10); asset.updatedBy = userId;
    return this.assetRepo.save(asset);
  }

  async deactivateAsset(companyId: string, userId: string, id: string): Promise<FixedAssetEntity> {
    const asset = await this.getAsset(companyId, id);
    if (asset.status !== AssetStatus.ACTIVE) throw new ConflictException('Only active assets can be deactivated');
    asset.status = AssetStatus.INACTIVE; asset.updatedBy = userId; return this.assetRepo.save(asset);
  }

  async removeAsset(companyId: string, id: string): Promise<{ message: string }> {
    const asset = await this.getAsset(companyId, id);
    if (asset.status !== AssetStatus.DRAFT) throw new ConflictException('Only draft assets can be deleted');
    await this.assetRepo.softRemove(asset); return { message: 'Fixed asset deleted successfully' };
  }

  private async getCategory(companyId: string, id: string): Promise<AssetCategoryEntity> { const e = await this.categoryRepo.findOne({ where: { companyId, id } }); if (!e) throw new NotFoundException('Asset category not found'); return e; }
  private async validateCategoryAccounts(companyId: string, assetId: string, accumulatedId: string, expenseId: string): Promise<void> {
    const ids = [assetId, accumulatedId, expenseId]; if (new Set(ids).size !== 3) throw new BadRequestException('Asset category accounts must be different');
    const accounts = await this.accountRepo.findBy(ids.map((id) => ({ id, companyId })));
    if (accounts.length !== 3) throw new BadRequestException('One or more asset category accounts are invalid');
    for (const account of accounts) if (account.status !== AccountStatus.ACTIVE || account.isGroup) throw new BadRequestException(`Account ${account.code} must be an active posting account`);
    const assetAccount = accounts.find((x) => x.id === assetId); const accumulated = accounts.find((x) => x.id === accumulatedId); const expense = accounts.find((x) => x.id === expenseId);
    if (assetAccount?.type !== AccountType.ASSET || accumulated?.type !== AccountType.ASSET) throw new BadRequestException('Asset and accumulated depreciation accounts must be asset accounts');
    if (expense?.type !== AccountType.EXPENSE) throw new BadRequestException('Depreciation expense account must be an expense account');
  }
  private validateDecliningRate(method: DepreciationMethod, rate?: number): void { if (method === DepreciationMethod.DECLINING_BALANCE && rate === undefined) throw new BadRequestException('Declining balance rate is required'); }
  private validateAssetValues(cost: number, residual: number, acquisitionDate: string, depreciationStartDate: string): void { if (residual > cost) throw new BadRequestException('Residual value cannot exceed acquisition cost'); if (depreciationStartDate < acquisitionDate) throw new BadRequestException('Depreciation start date cannot be before acquisition date'); }
  private async generateAssetNumber(companyId: string, repo: Repository<FixedAssetEntity>): Promise<string> { const row = await repo.createQueryBuilder('a').withDeleted().select('a.asset_number', 'number').where('a.company_id = :companyId', { companyId }).andWhere("a.asset_number ~ '^FA-[0-9]+$'").orderBy("CAST(SUBSTRING(a.asset_number FROM 4) AS INTEGER)", 'DESC').getRawOne<{ number?: string }>(); const next = row?.number ? Number(row.number.slice(3)) + 1 : 1; return `FA-${String(next).padStart(6, '0')}`; }
  private optional(value?: string): string | null { const normalized = value?.trim(); return normalized ? normalized : null; }
}
