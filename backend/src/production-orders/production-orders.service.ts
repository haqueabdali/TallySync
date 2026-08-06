import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';

import { BillOfMaterialEntity } from '../bill-of-materials/entities/bill-of-material.entity';
import { BillOfMaterialStatus } from '../bill-of-materials/enums/bill-of-material-status.enum';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ProductionOrderFilterDto } from './dto/production-order-filter.dto';
import { PaginatedProductionOrdersResponseDto, ProductionOrderResponseDto } from './dto/production-order-response.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { ProductionOrderComponentEntity } from './entities/production-order-component.entity';
import { ProductionOrderEntity } from './entities/production-order.entity';
import { ProductionOrderStatus } from './enums/production-order-status.enum';

@Injectable()
export class ProductionOrdersService {
  constructor(
    @InjectRepository(ProductionOrderEntity)
    private readonly orderRepository: Repository<ProductionOrderEntity>,
    @InjectRepository(BillOfMaterialEntity)
    private readonly bomRepository: Repository<BillOfMaterialEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateProductionOrderDto, companyId: string, userId: string): Promise<ProductionOrderResponseDto> {
    this.validateDates(dto.plannedStartDate, dto.plannedEndDate);
    const orderNumber = dto.orderNumber.trim();
    const duplicate = await this.orderRepository.exists({ where: { companyId, orderNumber } });
    if (duplicate) throw new ConflictException(`Production order ${orderNumber} already exists`);

    const [bom, warehouse] = await Promise.all([
      this.getActiveBom(dto.billOfMaterialId, companyId),
      this.getWarehouse(dto.warehouseId, companyId),
    ]);
    const multiplier = dto.plannedQuantity / bom.outputQuantity;

    const id = await this.dataSource.transaction(async (manager) => {
      const order = manager.create(ProductionOrderEntity, {
        companyId,
        orderNumber,
        billOfMaterialId: bom.id,
        finishedItemId: bom.finishedItemId,
        warehouseId: warehouse.id,
        status: ProductionOrderStatus.DRAFT,
        plannedQuantity: dto.plannedQuantity,
        completedQuantity: 0,
        plannedStartDate: dto.plannedStartDate ?? null,
        plannedEndDate: dto.plannedEndDate ?? null,
        actualStartDate: null,
        actualEndDate: null,
        notes: dto.notes?.trim() ?? null,
        createdBy: userId,
        updatedBy: userId,
      });
      const saved = await manager.save(order);
      const components = bom.components.map((component) => {
        const requiredQuantity = component.quantity * multiplier * (1 + component.scrapPercentage / 100);
        return manager.create(ProductionOrderComponentEntity, {
          productionOrderId: saved.id,
          componentItemId: component.componentItemId,
          bomQuantity: component.quantity,
          scrapPercentage: component.scrapPercentage,
          requiredQuantity: this.roundQuantity(requiredQuantity),
          consumedQuantity: 0,
          notes: component.notes,
        });
      });
      await manager.save(components);
      return saved.id;
    });
    return this.findOne(id, companyId);
  }

  async findAll(filter: ProductionOrderFilterDto, companyId: string): Promise<PaginatedProductionOrdersResponseDto> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.billOfMaterial', 'bom')
      .leftJoinAndSelect('order.finishedItem', 'finishedItem')
      .leftJoinAndSelect('order.warehouse', 'warehouse')
      .leftJoinAndSelect('order.components', 'components')
      .leftJoinAndSelect('components.componentItem', 'componentItem')
      .where('order.companyId = :companyId', { companyId })
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('components.createdAt', 'ASC');

    if (filter.status) query.andWhere('order.status = :status', { status: filter.status });
    if (filter.warehouseId) query.andWhere('order.warehouseId = :warehouseId', { warehouseId: filter.warehouseId });
    if (filter.finishedItemId) query.andWhere('order.finishedItemId = :finishedItemId', { finishedItemId: filter.finishedItemId });
    if (filter.search?.trim()) {
      query.andWhere(new Brackets((sub) => {
        sub.where('order.orderNumber ILIKE :search').orWhere('finishedItem.name ILIKE :search').orWhere('bom.code ILIKE :search');
      }), { search: `%${filter.search.trim()}%` });
    }

    const [rows, total] = await query.skip((filter.page - 1) * filter.limit).take(filter.limit).getManyAndCount();
    return { data: rows.map((row) => this.toResponse(row)), total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) };
  }

  async findOne(id: string, companyId: string): Promise<ProductionOrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id, companyId },
      relations: { billOfMaterial: true, finishedItem: true, warehouse: true, components: { componentItem: true } },
      order: { components: { createdAt: 'ASC' } },
    });
    if (!order) throw new NotFoundException('Production order not found');
    return this.toResponse(order);
  }

  async update(id: string, dto: UpdateProductionOrderDto, companyId: string, userId: string): Promise<ProductionOrderResponseDto> {
    const current = await this.getEntity(id, companyId);
    if (current.status !== ProductionOrderStatus.DRAFT) throw new BadRequestException('Only draft production orders can be updated');
    const start = dto.plannedStartDate ?? current.plannedStartDate ?? undefined;
    const end = dto.plannedEndDate ?? current.plannedEndDate ?? undefined;
    this.validateDates(start, end);
    const orderNumber = dto.orderNumber?.trim() ?? current.orderNumber;
    if (orderNumber !== current.orderNumber && await this.orderRepository.exists({ where: { companyId, orderNumber } })) {
      throw new ConflictException(`Production order ${orderNumber} already exists`);
    }

    const bomId = dto.billOfMaterialId ?? current.billOfMaterialId;
    const warehouseId = dto.warehouseId ?? current.warehouseId;
    const quantity = dto.plannedQuantity ?? current.plannedQuantity;
    const [bom, warehouse] = await Promise.all([this.getActiveBom(bomId, companyId), this.getWarehouse(warehouseId, companyId)]);
    const multiplier = quantity / bom.outputQuantity;

    await this.dataSource.transaction(async (manager) => {
      manager.merge(ProductionOrderEntity, current, {
        orderNumber,
        billOfMaterialId: bom.id,
        finishedItemId: bom.finishedItemId,
        warehouseId: warehouse.id,
        plannedQuantity: quantity,
        plannedStartDate: dto.plannedStartDate ?? current.plannedStartDate,
        plannedEndDate: dto.plannedEndDate ?? current.plannedEndDate,
        notes: dto.notes === undefined ? current.notes : dto.notes.trim() || null,
        updatedBy: userId,
      });
      await manager.save(current);
      await manager.delete(ProductionOrderComponentEntity, { productionOrderId: current.id });
      await manager.save(bom.components.map((component) => manager.create(ProductionOrderComponentEntity, {
        productionOrderId: current.id,
        componentItemId: component.componentItemId,
        bomQuantity: component.quantity,
        scrapPercentage: component.scrapPercentage,
        requiredQuantity: this.roundQuantity(component.quantity * multiplier * (1 + component.scrapPercentage / 100)),
        consumedQuantity: 0,
        notes: component.notes,
      })));
    });
    return this.findOne(id, companyId);
  }

  async release(id: string, companyId: string, userId: string): Promise<ProductionOrderResponseDto> {
    const order = await this.getEntity(id, companyId);
    if (order.status !== ProductionOrderStatus.DRAFT) throw new BadRequestException('Only draft production orders can be released');
    await this.orderRepository.update({ id, companyId }, { status: ProductionOrderStatus.RELEASED, updatedBy: userId });
    return this.findOne(id, companyId);
  }

  async start(id: string, companyId: string, userId: string): Promise<ProductionOrderResponseDto> {
    const order = await this.getEntity(id, companyId);
    if (order.status !== ProductionOrderStatus.RELEASED) throw new BadRequestException('Only released production orders can be started');
    await this.orderRepository.update({ id, companyId }, { status: ProductionOrderStatus.IN_PROGRESS, actualStartDate: new Date(), updatedBy: userId });
    return this.findOne(id, companyId);
  }

  async cancel(id: string, companyId: string, userId: string): Promise<ProductionOrderResponseDto> {
    const order = await this.getEntity(id, companyId);
    if (![ProductionOrderStatus.DRAFT, ProductionOrderStatus.RELEASED].includes(order.status)) {
      throw new BadRequestException('Only draft or released production orders can be cancelled');
    }
    await this.orderRepository.update({ id, companyId }, { status: ProductionOrderStatus.CANCELLED, updatedBy: userId });
    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string): Promise<{ message: string }> {
    const order = await this.getEntity(id, companyId);
    if (order.status !== ProductionOrderStatus.DRAFT) throw new BadRequestException('Only draft production orders can be deleted');
    await this.orderRepository.softRemove(order);
    return { message: 'Production order deleted successfully' };
  }

  private async getEntity(id: string, companyId: string): Promise<ProductionOrderEntity> {
    const order = await this.orderRepository.findOne({ where: { id, companyId } });
    if (!order) throw new NotFoundException('Production order not found');
    return order;
  }

  private async getActiveBom(id: string, companyId: string): Promise<BillOfMaterialEntity> {
    const bom = await this.bomRepository.findOne({ where: { id, companyId, status: BillOfMaterialStatus.ACTIVE }, relations: { components: true } });
    if (!bom) throw new BadRequestException('Active bill of material not found');
    if (bom.components.length === 0) throw new BadRequestException('Bill of material has no components');
    return bom;
  }

  private async getWarehouse(id: string, companyId: string): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepository.findOne({ where: { id, companyId, isActive: true } });
    if (!warehouse) throw new BadRequestException('Active warehouse not found');
    return warehouse;
  }

  private validateDates(start?: string, end?: string): void {
    if (start && end && end < start) throw new BadRequestException('plannedEndDate must be on or after plannedStartDate');
  }

  private roundQuantity(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private toResponse(entity: ProductionOrderEntity): ProductionOrderResponseDto {
    return {
      id: entity.id,
      companyId: entity.companyId,
      orderNumber: entity.orderNumber,
      billOfMaterialId: entity.billOfMaterialId,
      billOfMaterialCode: entity.billOfMaterial.code,
      finishedItemId: entity.finishedItemId,
      finishedItemName: entity.finishedItem.name,
      finishedItemSku: entity.finishedItem.sku,
      warehouseId: entity.warehouseId,
      warehouseName: entity.warehouse.name,
      status: entity.status,
      plannedQuantity: entity.plannedQuantity,
      completedQuantity: entity.completedQuantity,
      plannedStartDate: entity.plannedStartDate,
      plannedEndDate: entity.plannedEndDate,
      actualStartDate: entity.actualStartDate,
      actualEndDate: entity.actualEndDate,
      notes: entity.notes,
      components: entity.components.map((component) => ({
        id: component.id,
        componentItemId: component.componentItemId,
        componentItemName: component.componentItem.name,
        componentItemSku: component.componentItem.sku,
        bomQuantity: component.bomQuantity,
        scrapPercentage: component.scrapPercentage,
        requiredQuantity: component.requiredQuantity,
        consumedQuantity: component.consumedQuantity,
        notes: component.notes,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
