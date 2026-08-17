import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { MovingAverageCostingService } from '../inventory-cost-engine/moving-average/moving-average-costing.service';
import { InventoryCostSourceType } from '../inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { ProductionOrderComponentEntity } from '../production-orders/entities/production-order-component.entity';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { ProductionOrderStatus } from '../production-orders/enums/production-order-status.enum';
import { CreateMaterialConsumptionDto } from './dto/create-material-consumption.dto';
import { MaterialConsumptionFilterDto } from './dto/material-consumption-filter.dto';
import { MaterialConsumptionLineEntity } from './entities/material-consumption-line.entity';
import { MaterialConsumptionEntity } from './entities/material-consumption.entity';
import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
@Injectable()
export class MaterialConsumptionService {
  constructor(
    @InjectRepository(AccountingSettingsEntity)
    private readonly accountingSettingsRepository: Repository<AccountingSettingsEntity>,
    private readonly accountingEngineService: AccountingEngineService,
    @InjectRepository(MaterialConsumptionEntity)
    private readonly consumptionRepository: Repository<MaterialConsumptionEntity>,
    private readonly dataSource: DataSource,
    private readonly movingAverageCostingService: MovingAverageCostingService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateMaterialConsumptionDto): Promise<MaterialConsumptionEntity> {
    this.assertUniqueComponentLines(dto);
    const saved = await this.dataSource.transaction((manager) =>
      this.createWithManager(manager, companyId, userId, dto),
    );

    await this.autoPostMaterialConsumptionIfEnabled(saved.id, companyId, userId);
    return saved;
  }

  async findAll(companyId: string, filter: MaterialConsumptionFilterDto): Promise<{
    data: MaterialConsumptionEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.consumptionRepository.createQueryBuilder('consumption')
      .leftJoinAndSelect('consumption.lines', 'lines')
      .leftJoinAndSelect('lines.item', 'item')
      .where('consumption.companyId = :companyId', { companyId });

    if (filter.productionOrderId) query.andWhere('consumption.productionOrderId = :productionOrderId', { productionOrderId: filter.productionOrderId });
    if (filter.status) query.andWhere('consumption.status = :status', { status: filter.status });
    if (filter.dateFrom) query.andWhere('consumption.consumptionDate >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) query.andWhere('consumption.consumptionDate <= :dateTo', { dateTo: filter.dateTo });

    const [data, total] = await query
      .orderBy('consumption.consumptionDate', 'DESC')
      .addOrderBy('consumption.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getManyAndCount();

    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(companyId: string, id: string): Promise<MaterialConsumptionEntity> {
    const entity = await this.consumptionRepository.findOne({
      where: { id, companyId },
      relations: { lines: { item: true }, productionOrder: true, warehouse: true },
    });
    if (!entity) throw new NotFoundException('Material consumption not found.');
    return entity;
  }
  private async autoPostMaterialConsumptionIfEnabled(
    sourceId: string,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const settings = await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

    if (settings?.autoPostMaterialConsumption === false) return;

    await this.accountingEngineService.postMaterialConsumption(
      sourceId,
      companyId,
      userId,
    );
  }

  private async createWithManager(
    manager: EntityManager,
    companyId: string,
    userId: string,
    dto: CreateMaterialConsumptionDto,
  ): Promise<MaterialConsumptionEntity> {
    const duplicate = await manager.getRepository(MaterialConsumptionEntity).findOne({
      where: { companyId, consumptionNumber: dto.consumptionNumber },
    });
    if (duplicate) throw new ConflictException('Material consumption number already exists.');

    const productionOrder = await manager.getRepository(ProductionOrderEntity)
      .createQueryBuilder('productionOrder')
      .setLock('pessimistic_write')
      .leftJoinAndSelect('productionOrder.components', 'components')
      .where('productionOrder.id = :id', { id: dto.productionOrderId })
      .andWhere('productionOrder.companyId = :companyId', { companyId })
      .andWhere('productionOrder.deletedAt IS NULL')
      .getOne();

    if (!productionOrder) throw new NotFoundException('Production order not found.');
    if (![ProductionOrderStatus.RELEASED, ProductionOrderStatus.IN_PROGRESS].includes(productionOrder.status)) {
      throw new BadRequestException('Material can only be consumed for a released or in-progress production order.');
    }

    const componentById = new Map(productionOrder.components.map((component) => [component.id, component]));
    const consumptionRepository = manager.getRepository(MaterialConsumptionEntity);
    const lineRepository = manager.getRepository(MaterialConsumptionLineEntity);

    const consumption = await consumptionRepository.save(consumptionRepository.create({
      companyId,
      consumptionNumber: dto.consumptionNumber,
      productionOrderId: productionOrder.id,
      warehouseId: productionOrder.warehouseId,
      consumptionDate: dto.consumptionDate,
      notes: dto.notes ?? null,
      createdBy: userId,
      lines: [],
    }));

    const savedLines: MaterialConsumptionLineEntity[] = [];
    for (const inputLine of dto.lines) {
      const component = componentById.get(inputLine.productionOrderComponentId);
      if (!component) throw new BadRequestException(`Production order component ${inputLine.productionOrderComponentId} is invalid.`);

      const remainingRequired = this.round6(component.requiredQuantity - component.consumedQuantity);
      if (inputLine.quantity > remainingRequired) {
        throw new BadRequestException(`Consumption quantity exceeds the remaining requirement for component ${component.componentItemId}.`);
      }

      const costTransaction = await this.movingAverageCostingService.recordIssue({
        companyId,
        itemId: component.componentItemId,
        warehouseId: productionOrder.warehouseId,
        transactionDate: dto.consumptionDate,
        sourceType: InventoryCostSourceType.STOCK_ADJUSTMENT,
        sourceId: consumption.id,
        sourceLineId: component.id,
        quantity: inputLine.quantity,
        createdBy: userId,
      }, { manager });

      component.consumedQuantity = this.round6(component.consumedQuantity + inputLine.quantity);
      await manager.getRepository(ProductionOrderComponentEntity).save(component);

      savedLines.push(await lineRepository.save(lineRepository.create({
        consumptionId: consumption.id,
        productionOrderComponentId: component.id,
        itemId: component.componentItemId,
        quantity: inputLine.quantity,
        unitCost: costTransaction.unitCost,
        totalCost: costTransaction.totalCost,
        notes: inputLine.notes ?? null,
      })));
    }

    if (productionOrder.status === ProductionOrderStatus.RELEASED) {
      productionOrder.status = ProductionOrderStatus.IN_PROGRESS;
      productionOrder.actualStartDate = productionOrder.actualStartDate ?? new Date();
      productionOrder.updatedBy = userId;
      await manager.getRepository(ProductionOrderEntity).save(productionOrder);
    }

    consumption.lines = savedLines;
    return consumption;
  }

  private assertUniqueComponentLines(dto: CreateMaterialConsumptionDto): void {
    const ids = dto.lines.map((line) => line.productionOrderComponentId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('A production-order component may appear only once per material consumption.');
    }
  }

  private round6(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }
}
