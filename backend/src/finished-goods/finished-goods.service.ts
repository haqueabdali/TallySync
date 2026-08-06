import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { MovingAverageCostingService } from '../inventory-cost-engine/moving-average/moving-average-costing.service';
import { InventoryCostSourceType } from '../inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { MaterialConsumptionLineEntity } from '../material-consumption/entities/material-consumption-line.entity';
import { MaterialConsumptionEntity } from '../material-consumption/entities/material-consumption.entity';
import { MaterialConsumptionStatus } from '../material-consumption/enums/material-consumption-status.enum';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { ProductionOrderStatus } from '../production-orders/enums/production-order-status.enum';
import { CreateFinishedGoodsReceiptDto } from './dto/create-finished-goods-receipt.dto';
import { FinishedGoodsReceiptFilterDto } from './dto/finished-goods-receipt-filter.dto';
import { FinishedGoodsReceiptEntity } from './entities/finished-goods-receipt.entity';
import { FinishedGoodsReceiptStatus } from './enums/finished-goods-receipt-status.enum';

@Injectable()
export class FinishedGoodsService {
  constructor(
    @InjectRepository(FinishedGoodsReceiptEntity)
    private readonly receiptRepository: Repository<FinishedGoodsReceiptEntity>,
    private readonly dataSource: DataSource,
    private readonly movingAverageCostingService: MovingAverageCostingService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateFinishedGoodsReceiptDto,
  ): Promise<FinishedGoodsReceiptEntity> {
    return this.dataSource.transaction((manager) =>
      this.createWithManager(manager, companyId, userId, dto),
    );
  }

  async findAll(companyId: string, filter: FinishedGoodsReceiptFilterDto): Promise<{
    data: FinishedGoodsReceiptEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.productionOrder', 'productionOrder')
      .leftJoinAndSelect('receipt.item', 'item')
      .leftJoinAndSelect('receipt.warehouse', 'warehouse')
      .where('receipt.companyId = :companyId', { companyId });

    if (filter.productionOrderId) {
      query.andWhere('receipt.productionOrderId = :productionOrderId', {
        productionOrderId: filter.productionOrderId,
      });
    }
    if (filter.itemId) query.andWhere('receipt.itemId = :itemId', { itemId: filter.itemId });
    if (filter.warehouseId) {
      query.andWhere('receipt.warehouseId = :warehouseId', { warehouseId: filter.warehouseId });
    }
    if (filter.status) query.andWhere('receipt.status = :status', { status: filter.status });
    if (filter.dateFrom) query.andWhere('receipt.receiptDate >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) query.andWhere('receipt.receiptDate <= :dateTo', { dateTo: filter.dateTo });

    const [data, total] = await query
      .orderBy('receipt.receiptDate', 'DESC')
      .addOrderBy('receipt.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getManyAndCount();

    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(companyId: string, id: string): Promise<FinishedGoodsReceiptEntity> {
    const receipt = await this.receiptRepository.findOne({
      where: { id, companyId },
      relations: { productionOrder: true, item: true, warehouse: true },
    });
    if (!receipt) throw new NotFoundException('Finished goods receipt not found.');
    return receipt;
  }

  private async createWithManager(
    manager: EntityManager,
    companyId: string,
    userId: string,
    dto: CreateFinishedGoodsReceiptDto,
  ): Promise<FinishedGoodsReceiptEntity> {
    const receiptRepository = manager.getRepository(FinishedGoodsReceiptEntity);
    const duplicate = await receiptRepository.findOne({
      where: { companyId, receiptNumber: dto.receiptNumber },
    });
    if (duplicate) throw new ConflictException('Finished goods receipt number already exists.');

    const productionOrder = await manager
      .getRepository(ProductionOrderEntity)
      .createQueryBuilder('productionOrder')
      .setLock('pessimistic_write')
      .where('productionOrder.id = :id', { id: dto.productionOrderId })
      .andWhere('productionOrder.companyId = :companyId', { companyId })
      .andWhere('productionOrder.deletedAt IS NULL')
      .getOne();

    if (!productionOrder) throw new NotFoundException('Production order not found.');
    if (productionOrder.status !== ProductionOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Finished goods can only be received for an in-progress production order.');
    }

    const remainingQuantity = this.round6(
      productionOrder.plannedQuantity - productionOrder.completedQuantity,
    );
    if (dto.quantity > remainingQuantity) {
      throw new BadRequestException('Receipt quantity exceeds the remaining production-order quantity.');
    }

    const consumedMaterialCost = await this.getConsumedMaterialCost(
      manager,
      companyId,
      productionOrder.id,
    );
    const previouslyCapitalizedCost = await this.getPreviouslyCapitalizedCost(
      manager,
      companyId,
      productionOrder.id,
    );
    const costAvailable = this.round6(consumedMaterialCost - previouslyCapitalizedCost);
    if (costAvailable < 0) {
      throw new ConflictException('Previously capitalized finished-goods cost exceeds consumed material cost.');
    }
    if (costAvailable === 0) {
      throw new BadRequestException('No unallocated material cost is available for finished-goods receipt.');
    }

    const unitCost = this.round6(costAvailable / dto.quantity);
    const receipt = await receiptRepository.save(
      receiptRepository.create({
        companyId,
        receiptNumber: dto.receiptNumber,
        productionOrderId: productionOrder.id,
        itemId: productionOrder.finishedItemId,
        warehouseId: productionOrder.warehouseId,
        receiptDate: dto.receiptDate,
        quantity: dto.quantity,
        unitCost,
        totalCost: costAvailable,
        status: FinishedGoodsReceiptStatus.POSTED,
        notes: dto.notes ?? null,
        createdBy: userId,
        reversedAt: null,
        reversedBy: null,
      }),
    );

    await this.movingAverageCostingService.recordReceipt(
      {
        companyId,
        itemId: productionOrder.finishedItemId,
        warehouseId: productionOrder.warehouseId,
        transactionDate: dto.receiptDate,
        sourceType: InventoryCostSourceType.STOCK_ADJUSTMENT,
        sourceId: receipt.id,
        sourceLineId: receipt.id,
        quantity: dto.quantity,
        unitCost,
        createdBy: userId,
      },
      { manager },
    );

    productionOrder.completedQuantity = this.round6(
      productionOrder.completedQuantity + dto.quantity,
    );
    productionOrder.updatedBy = userId;
    if (productionOrder.completedQuantity === productionOrder.plannedQuantity) {
      productionOrder.status = ProductionOrderStatus.COMPLETED;
      productionOrder.actualEndDate = new Date();
    }
    await manager.getRepository(ProductionOrderEntity).save(productionOrder);

    receipt.productionOrder = productionOrder;
    return receipt;
  }

  private async getConsumedMaterialCost(
    manager: EntityManager,
    companyId: string,
    productionOrderId: string,
  ): Promise<number> {
    const result: { total: string | null } | undefined = await manager
      .getRepository(MaterialConsumptionLineEntity)
      .createQueryBuilder('line')
      .innerJoin(MaterialConsumptionEntity, 'consumption', 'consumption.id = line.consumptionId')
      .select('COALESCE(SUM(line.totalCost), 0)', 'total')
      .where('consumption.companyId = :companyId', { companyId })
      .andWhere('consumption.productionOrderId = :productionOrderId', { productionOrderId })
      .andWhere('consumption.status = :status', { status: MaterialConsumptionStatus.POSTED })
      .getRawOne<{ total: string | null }>();

    return Number(result?.total ?? 0);
  }

  private async getPreviouslyCapitalizedCost(
    manager: EntityManager,
    companyId: string,
    productionOrderId: string,
  ): Promise<number> {
    const result: { total: string | null } | undefined = await manager
      .getRepository(FinishedGoodsReceiptEntity)
      .createQueryBuilder('receipt')
      .select('COALESCE(SUM(receipt.totalCost), 0)', 'total')
      .where('receipt.companyId = :companyId', { companyId })
      .andWhere('receipt.productionOrderId = :productionOrderId', { productionOrderId })
      .andWhere('receipt.status = :status', { status: FinishedGoodsReceiptStatus.POSTED })
      .getRawOne<{ total: string | null }>();

    return Number(result?.total ?? 0);
  }

  private round6(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }
}
