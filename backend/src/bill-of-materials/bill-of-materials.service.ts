import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';
import { BillOfMaterialFilterDto } from './dto/bill-of-material-filter.dto';
import {
  BillOfMaterialResponseDto,
  PaginatedBillsOfMaterialResponseDto,
} from './dto/bill-of-material-response.dto';
import {
  CreateBillOfMaterialComponentDto,
  CreateBillOfMaterialDto,
} from './dto/create-bill-of-material.dto';
import { UpdateBillOfMaterialDto } from './dto/update-bill-of-material.dto';
import { BillOfMaterialComponentEntity } from './entities/bill-of-material-component.entity';
import { BillOfMaterialEntity } from './entities/bill-of-material.entity';
import { BillOfMaterialStatus } from './enums/bill-of-material-status.enum';

@Injectable()
export class BillOfMaterialsService {
  constructor(
    @InjectRepository(BillOfMaterialEntity)
    private readonly bomRepository: Repository<BillOfMaterialEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateBillOfMaterialDto,
    companyId: string,
    userId: string,
  ): Promise<BillOfMaterialResponseDto> {
    this.validateDates(dto.effectiveFrom, dto.effectiveTo);
    this.validateComponents(dto.finishedItemId, dto.components);
    await this.validateItems(companyId, dto.finishedItemId, dto.components);

    const existingCode = await this.bomRepository.exists({
      where: { companyId, code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException(`BOM code ${dto.code} already exists`);
    }

    const savedId = await this.dataSource.transaction(async (manager) => {
      const bom = manager.create(BillOfMaterialEntity, {
        companyId,
        finishedItemId: dto.finishedItemId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        version: dto.version ?? 1,
        outputQuantity: dto.outputQuantity,
        status: BillOfMaterialStatus.DRAFT,
        effectiveFrom: dto.effectiveFrom ?? null,
        effectiveTo: dto.effectiveTo ?? null,
        notes: dto.notes?.trim() ?? null,
        createdBy: userId,
        updatedBy: userId,
      });
      const saved = await manager.save(bom);
      const components = dto.components.map((component) =>
        manager.create(BillOfMaterialComponentEntity, {
          billOfMaterialId: saved.id,
          componentItemId: component.componentItemId,
          quantity: component.quantity,
          scrapPercentage: component.scrapPercentage ?? 0,
          notes: component.notes?.trim() ?? null,
        }),
      );
      await manager.save(components);
      return saved.id;
    });

    return this.findOne(savedId, companyId);
  }

  async findAll(
    filter: BillOfMaterialFilterDto,
    companyId: string,
  ): Promise<PaginatedBillsOfMaterialResponseDto> {
    const query = this.bomRepository
      .createQueryBuilder('bom')
      .leftJoinAndSelect('bom.finishedItem', 'finishedItem')
      .leftJoinAndSelect('bom.components', 'components')
      .leftJoinAndSelect('components.componentItem', 'componentItem')
      .where('bom.companyId = :companyId', { companyId })
      .orderBy('bom.createdAt', 'DESC')
      .addOrderBy('components.createdAt', 'ASC');

    if (filter.finishedItemId) {
      query.andWhere('bom.finishedItemId = :finishedItemId', {
        finishedItemId: filter.finishedItemId,
      });
    }
    if (filter.status) {
      query.andWhere('bom.status = :status', { status: filter.status });
    }
    if (filter.search?.trim()) {
      query.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('bom.code ILIKE :search')
            .orWhere('bom.name ILIKE :search')
            .orWhere('finishedItem.name ILIKE :search');
        }),
        { search: `%${filter.search.trim()}%` },
      );
    }

    const [rows, total] = await query
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getManyAndCount();

    return {
      data: rows.map((row) => this.toResponse(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      totalPages: Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: string, companyId: string): Promise<BillOfMaterialResponseDto> {
    const bom = await this.bomRepository.findOne({
      where: { id, companyId },
      relations: {
        finishedItem: true,
        components: { componentItem: true },
      },
      order: { components: { createdAt: 'ASC' } },
    });
    if (!bom) {
      throw new NotFoundException('Bill of material not found');
    }
    return this.toResponse(bom);
  }

  async update(
    id: string,
    dto: UpdateBillOfMaterialDto,
    companyId: string,
    userId: string,
  ): Promise<BillOfMaterialResponseDto> {
    const current = await this.getEntity(id, companyId);
    if (current.status !== BillOfMaterialStatus.DRAFT) {
      throw new BadRequestException('Only draft BOMs can be updated');
    }

    const finishedItemId = dto.finishedItemId ?? current.finishedItemId;
    const effectiveFrom = dto.effectiveFrom ?? current.effectiveFrom ?? undefined;
    const effectiveTo = dto.effectiveTo ?? current.effectiveTo ?? undefined;
    this.validateDates(effectiveFrom, effectiveTo);

    if (dto.components) {
      this.validateComponents(finishedItemId, dto.components);
      await this.validateItems(companyId, finishedItemId, dto.components);
    } else if (dto.finishedItemId && dto.finishedItemId !== current.finishedItemId) {
      const existingComponents = await this.dataSource
        .getRepository(BillOfMaterialComponentEntity)
        .find({ where: { billOfMaterialId: current.id } });
      this.validateComponents(
        finishedItemId,
        existingComponents.map((component) => ({
          componentItemId: component.componentItemId,
          quantity: component.quantity,
          scrapPercentage: component.scrapPercentage,
          notes: component.notes ?? undefined,
        })),
      );
      await this.validateItems(companyId, finishedItemId, []);
    }

    if (dto.code && dto.code.trim() !== current.code) {
      const duplicate = await this.bomRepository.exists({
        where: { companyId, code: dto.code.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`BOM code ${dto.code} already exists`);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      manager.merge(BillOfMaterialEntity, current, {
        finishedItemId,
        code: dto.code?.trim() ?? current.code,
        name: dto.name?.trim() ?? current.name,
        version: dto.version ?? current.version,
        outputQuantity: dto.outputQuantity ?? current.outputQuantity,
        effectiveFrom: dto.effectiveFrom ?? current.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? current.effectiveTo,
        notes: dto.notes === undefined ? current.notes : dto.notes.trim() || null,
        updatedBy: userId,
      });
      await manager.save(current);

      if (dto.components) {
        await manager.delete(BillOfMaterialComponentEntity, {
          billOfMaterialId: current.id,
        });
        await manager.save(
          dto.components.map((component) =>
            manager.create(BillOfMaterialComponentEntity, {
              billOfMaterialId: current.id,
              componentItemId: component.componentItemId,
              quantity: component.quantity,
              scrapPercentage: component.scrapPercentage ?? 0,
              notes: component.notes?.trim() ?? null,
            }),
          ),
        );
      }
    });

    return this.findOne(id, companyId);
  }

  async activate(id: string, companyId: string, userId: string): Promise<BillOfMaterialResponseDto> {
    const bom = await this.getEntity(id, companyId);
    const componentCount = await this.dataSource
      .getRepository(BillOfMaterialComponentEntity)
      .count({ where: { billOfMaterialId: id } });
    if (componentCount === 0) {
      throw new BadRequestException('A BOM must contain at least one component');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        BillOfMaterialEntity,
        {
          companyId,
          finishedItemId: bom.finishedItemId,
          status: BillOfMaterialStatus.ACTIVE,
        },
        { status: BillOfMaterialStatus.INACTIVE, updatedBy: userId },
      );
      await manager.update(
        BillOfMaterialEntity,
        { id, companyId },
        { status: BillOfMaterialStatus.ACTIVE, updatedBy: userId },
      );
    });
    return this.findOne(id, companyId);
  }

  async deactivate(id: string, companyId: string, userId: string): Promise<BillOfMaterialResponseDto> {
    await this.getEntity(id, companyId);
    await this.bomRepository.update(
      { id, companyId },
      { status: BillOfMaterialStatus.INACTIVE, updatedBy: userId },
    );
    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string): Promise<{ message: string }> {
    const bom = await this.getEntity(id, companyId);
    if (bom.status === BillOfMaterialStatus.ACTIVE) {
      throw new BadRequestException('Active BOMs cannot be deleted');
    }
    await this.bomRepository.softRemove(bom);
    return { message: 'Bill of material deleted successfully' };
  }

  private async getEntity(id: string, companyId: string): Promise<BillOfMaterialEntity> {
    const bom = await this.bomRepository.findOne({ where: { id, companyId } });
    if (!bom) {
      throw new NotFoundException('Bill of material not found');
    }
    return bom;
  }

  private validateComponents(
    finishedItemId: string,
    components: CreateBillOfMaterialComponentDto[],
  ): void {
    const ids = components.map((component) => component.componentItemId);
    if (ids.includes(finishedItemId)) {
      throw new BadRequestException('Finished item cannot be its own component');
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate component items are not allowed');
    }
  }

  private async validateItems(
    companyId: string,
    finishedItemId: string,
    components: CreateBillOfMaterialComponentDto[],
  ): Promise<void> {
    const ids = [...new Set([finishedItemId, ...components.map((item) => item.componentItemId)])];
    const count = await this.itemRepository.count({
      where: { id: In(ids), companyId },
    });
    if (count !== ids.length) {
      throw new BadRequestException('One or more BOM items do not belong to the company or do not exist');
    }
  }

  private validateDates(effectiveFrom?: string, effectiveTo?: string): void {
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom');
    }
  }

  private toResponse(entity: BillOfMaterialEntity): BillOfMaterialResponseDto {
    return {
      id: entity.id,
      companyId: entity.companyId,
      finishedItemId: entity.finishedItemId,
      finishedItemName: entity.finishedItem.name,
      finishedItemSku: entity.finishedItem.sku,
      code: entity.code,
      name: entity.name,
      version: entity.version,
      outputQuantity: entity.outputQuantity,
      status: entity.status,
      effectiveFrom: entity.effectiveFrom,
      effectiveTo: entity.effectiveTo,
      notes: entity.notes,
      components: entity.components.map((component) => ({
        id: component.id,
        componentItemId: component.componentItemId,
        componentItemName: component.componentItem.name,
        componentItemSku: component.componentItem.sku,
        quantity: component.quantity,
        scrapPercentage: component.scrapPercentage,
        effectiveQuantity: component.quantity * (1 + component.scrapPercentage / 100),
        notes: component.notes,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
