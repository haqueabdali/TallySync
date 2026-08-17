import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ItemEntity } from '../inventory/entities/item.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateNegativeInventoryPolicyDto } from './dto/create-negative-inventory-policy.dto';
import { NegativeInventoryPolicyFilterDto } from './dto/negative-inventory-policy-filter.dto';
import { UpdateNegativeInventoryPolicyDto } from './dto/update-negative-inventory-policy.dto';
import { NegativeInventoryPolicyEntity } from './entities/negative-inventory-policy.entity';
import { NegativeInventoryMode } from './enums/negative-inventory-mode.enum';
import type { NegativeInventoryCheckInput, NegativeInventoryDecision } from './interfaces/negative-inventory-check.interface';

@Injectable()
export class NegativeInventoryPolicyService {
  constructor(
    @InjectRepository(NegativeInventoryPolicyEntity)
    private readonly policyRepository: Repository<NegativeInventoryPolicyEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
  ) {}

  async create(companyId: string, dto: CreateNegativeInventoryPolicyDto): Promise<NegativeInventoryPolicyEntity> {
    this.validateScope(dto.warehouseId, dto.itemId);
    this.validateLimit(dto.mode, dto.maxNegativeQuantity);
    await this.validateReferences(companyId, dto.warehouseId, dto.itemId);
    await this.ensureUniqueScope(companyId, dto.warehouseId ?? null, dto.itemId ?? null);

    return this.policyRepository.save(this.policyRepository.create({
      companyId,
      warehouseId: dto.warehouseId ?? null,
      itemId: dto.itemId ?? null,
      mode: dto.mode,
      maxNegativeQuantity: dto.mode === NegativeInventoryMode.ALLOW_WITH_LIMIT
        ? String(dto.maxNegativeQuantity)
        : null,
      isActive: dto.isActive ?? true,
      notes: dto.notes ?? null,
    }));
  }

  async findAll(companyId: string, filter: NegativeInventoryPolicyFilterDto): Promise<NegativeInventoryPolicyEntity[]> {
    const query = this.policyRepository.createQueryBuilder('policy')
      .where('policy.companyId = :companyId', { companyId })
      .orderBy('policy.warehouseId', 'ASC', 'NULLS FIRST')
      .addOrderBy('policy.itemId', 'ASC', 'NULLS FIRST');

    if (filter.warehouseId) query.andWhere('policy.warehouseId = :warehouseId', { warehouseId: filter.warehouseId });
    if (filter.itemId) query.andWhere('policy.itemId = :itemId', { itemId: filter.itemId });
    if (filter.isActive !== undefined) query.andWhere('policy.isActive = :isActive', { isActive: filter.isActive });
    return query.getMany();
  }

  async findOne(companyId: string, id: string): Promise<NegativeInventoryPolicyEntity> {
    const policy = await this.policyRepository.findOne({ where: { id, companyId } });
    if (!policy) throw new NotFoundException('Negative inventory policy not found.');
    return policy;
  }

  async update(companyId: string, id: string, dto: UpdateNegativeInventoryPolicyDto): Promise<NegativeInventoryPolicyEntity> {
    const policy = await this.findOne(companyId, id);
    const warehouseId = dto.warehouseId !== undefined ? dto.warehouseId : policy.warehouseId ?? undefined;
    const itemId = dto.itemId !== undefined ? dto.itemId : policy.itemId ?? undefined;
    const mode = dto.mode ?? policy.mode;
    const maxNegativeQuantity = dto.maxNegativeQuantity !== undefined
      ? dto.maxNegativeQuantity
      : policy.maxNegativeQuantity === null ? undefined : Number(policy.maxNegativeQuantity);

    this.validateScope(warehouseId, itemId);
    this.validateLimit(mode, maxNegativeQuantity);
    await this.validateReferences(companyId, warehouseId, itemId);
    await this.ensureUniqueScope(companyId, warehouseId ?? null, itemId ?? null, id);

    policy.warehouseId = warehouseId ?? null;
    policy.itemId = itemId ?? null;
    policy.mode = mode;
    policy.maxNegativeQuantity = mode === NegativeInventoryMode.ALLOW_WITH_LIMIT ? String(maxNegativeQuantity) : null;
    if (dto.isActive !== undefined) policy.isActive = dto.isActive;
    if (dto.notes !== undefined) policy.notes = dto.notes;
    return this.policyRepository.save(policy);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const policy = await this.findOne(companyId, id);
    await this.policyRepository.softRemove(policy);
  }

  async resolve(companyId: string, warehouseId: string, itemId: string): Promise<NegativeInventoryPolicyEntity | null> {
    const itemWarehouse = await this.policyRepository.findOne({
      where: { companyId, warehouseId, itemId, isActive: true },
    });
    if (itemWarehouse) return itemWarehouse;

    const warehouse = await this.policyRepository.findOne({
      where: { companyId, warehouseId, itemId: IsNull(), isActive: true },
    });
    if (warehouse) return warehouse;

    return this.policyRepository.findOne({
      where: { companyId, warehouseId: IsNull(), itemId: IsNull(), isActive: true },
    });
  }

  async evaluate(input: NegativeInventoryCheckInput): Promise<NegativeInventoryDecision> {
    if (input.issueQuantity <= 0) throw new BadRequestException('Issue quantity must be greater than zero.');
    const projectedQuantity = this.round(input.currentQuantity - input.issueQuantity);
    const policy = await this.resolve(input.companyId, input.warehouseId, input.itemId);
    const mode = policy?.mode ?? NegativeInventoryMode.BLOCK;
    const maxNegativeQuantity = policy?.maxNegativeQuantity === null || policy?.maxNegativeQuantity === undefined
      ? null
      : Number(policy.maxNegativeQuantity);

    if (projectedQuantity >= 0 || mode === NegativeInventoryMode.ALLOW) {
      return { allowed: true, projectedQuantity, mode, maxNegativeQuantity, policyId: policy?.id ?? null, reason: null };
    }

    if (mode === NegativeInventoryMode.ALLOW_WITH_LIMIT && maxNegativeQuantity !== null && projectedQuantity >= -maxNegativeQuantity) {
      return { allowed: true, projectedQuantity, mode, maxNegativeQuantity, policyId: policy?.id ?? null, reason: null };
    }

    return {
      allowed: false,
      projectedQuantity,
      mode,
      maxNegativeQuantity,
      policyId: policy?.id ?? null,
      reason: mode === NegativeInventoryMode.ALLOW_WITH_LIMIT
        ? `Projected stock ${projectedQuantity} exceeds the allowed negative limit of ${maxNegativeQuantity}.`
        : `Projected stock ${projectedQuantity} would be negative.`,
    };
  }

  async assertIssueAllowed(input: NegativeInventoryCheckInput): Promise<NegativeInventoryDecision> {
    const decision = await this.evaluate(input);
    if (!decision.allowed) throw new ConflictException(decision.reason);
    return decision;
  }

  private validateScope(warehouseId?: string, itemId?: string): void {
    if (itemId && !warehouseId) throw new BadRequestException('itemId requires warehouseId.');
  }

  private validateLimit(mode: NegativeInventoryMode, maxNegativeQuantity?: number): void {
    if (mode === NegativeInventoryMode.ALLOW_WITH_LIMIT && maxNegativeQuantity === undefined) {
      throw new BadRequestException('maxNegativeQuantity is required for allow_with_limit.');
    }
  }

  private async validateReferences(companyId: string, warehouseId?: string, itemId?: string): Promise<void> {
    if (warehouseId) {
      const warehouse = await this.warehouseRepository.findOne({ where: { id: warehouseId, companyId } });
      if (!warehouse) throw new BadRequestException('Warehouse does not belong to the company.');
    }
    if (itemId) {
      const item = await this.itemRepository.findOne({ where: { id: itemId, companyId } });
      if (!item) throw new BadRequestException('Item does not belong to the company.');
    }
  }

  private async ensureUniqueScope(companyId: string, warehouseId: string | null, itemId: string | null, excludeId?: string): Promise<void> {
    const query = this.policyRepository.createQueryBuilder('policy')
      .where('policy.companyId = :companyId', { companyId })
      .andWhere(warehouseId === null ? 'policy.warehouseId IS NULL' : 'policy.warehouseId = :warehouseId', { warehouseId })
      .andWhere(itemId === null ? 'policy.itemId IS NULL' : 'policy.itemId = :itemId', { itemId });
    if (excludeId) query.andWhere('policy.id <> :excludeId', { excludeId });
    if (await query.getOne()) throw new ConflictException('A policy already exists for this scope.');
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }
}
