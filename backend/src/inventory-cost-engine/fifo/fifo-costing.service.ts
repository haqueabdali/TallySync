import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ItemEntity } from '../../inventory/entities/item.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { InventoryCostBalanceEntity } from '../entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../entities/inventory-cost-transaction.entity';
import { InventoryCostTransactionType } from '../enums/inventory-cost-transaction-type.enum';
import { FifoCostAllocationEntity } from './entities/fifo-cost-allocation.entity';
import { FifoCostLayerEntity } from './entities/fifo-cost-layer.entity';
import { FifoAllocator } from './fifo-allocator';
import type {
  FifoExecutionOptions,
  RecordFifoIssueInput,
  RecordFifoReceiptInput,
} from './interfaces/fifo-transaction.interface';

@Injectable()
export class FifoCostingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly allocator: FifoAllocator,
  ) {}

  async recordReceipt(
    input: RecordFifoReceiptInput,
    options: FifoExecutionOptions = {},
  ): Promise<InventoryCostTransactionEntity> {
    if (options.manager) {
      return this.recordReceiptWithManager(options.manager, input);
    }

    return this.dataSource.transaction((manager) =>
      this.recordReceiptWithManager(manager, input),
    );
  }

  async recordIssue(
    input: RecordFifoIssueInput,
    options: FifoExecutionOptions = {},
  ): Promise<InventoryCostTransactionEntity> {
    if (options.manager) {
      return this.recordIssueWithManager(options.manager, input);
    }

    return this.dataSource.transaction((manager) =>
      this.recordIssueWithManager(manager, input),
    );
  }

  private async recordReceiptWithManager(
    manager: EntityManager,
    input: RecordFifoReceiptInput,
  ): Promise<InventoryCostTransactionEntity> {
    this.assertPositive(input.quantity, 'Receipt quantity');
    this.assertNonNegative(input.unitCost, 'Receipt unit cost');

    const existing = await this.findExisting(
      manager,
      input,
      InventoryCostTransactionType.RECEIPT,
    );
    if (existing) return existing;

    await this.assertReferences(manager, input);
    await this.acquireBalanceLock(manager, input);
    const balance = await this.getOrCreateBalance(manager, input);

    const quantity = this.roundQuantity(input.quantity);
    const unitCost = this.roundUnitCost(input.unitCost);
    const totalCost = this.roundValue(quantity * unitCost);
    const quantityAfter = this.roundQuantity(balance.quantity + quantity);
    const inventoryValueAfter = this.roundValue(
      balance.inventoryValue + totalCost,
    );
    const averageUnitCostAfter =
      quantityAfter === 0
        ? 0
        : this.roundUnitCost(inventoryValueAfter / quantityAfter);

    const layerRepository = manager.getRepository(FifoCostLayerEntity);
    await layerRepository.save(
      layerRepository.create({
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        receivedDate: input.transactionDate,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceLineId: input.sourceLineId,
        originalQuantity: quantity,
        remainingQuantity: quantity,
        unitCost,
        originalValue: totalCost,
        remainingValue: totalCost,
        createdBy: input.createdBy ?? null,
      }),
    );

    await this.updateBalance(manager, balance, {
      quantityAfter,
      averageUnitCostAfter,
      inventoryValueAfter,
    });

    return this.saveTransaction(
      manager,
      input,
      InventoryCostTransactionType.RECEIPT,
      {
        quantity,
        unitCost,
        totalCost,
        quantityAfter,
        averageUnitCostAfter,
        inventoryValueAfter,
      },
    );
  }

  private async recordIssueWithManager(
    manager: EntityManager,
    input: RecordFifoIssueInput,
  ): Promise<InventoryCostTransactionEntity> {
    this.assertPositive(input.quantity, 'Issue quantity');

    const existing = await this.findExisting(
      manager,
      input,
      InventoryCostTransactionType.ISSUE,
    );
    if (existing) return existing;

    await this.assertReferences(manager, input);
    await this.acquireBalanceLock(manager, input);
    const balance = await this.getBalanceForUpdate(manager, input);
    if (!balance) {
      throw new NotFoundException('Inventory cost balance not found.');
    }

    const quantity = this.roundQuantity(input.quantity);
    if (balance.quantity < quantity) {
      throw new BadRequestException('Insufficient inventory quantity.');
    }

    const layers = await manager
      .getRepository(FifoCostLayerEntity)
      .createQueryBuilder('layer')
      .setLock('pessimistic_write')
      .where('layer.companyId = :companyId', { companyId: input.companyId })
      .andWhere('layer.itemId = :itemId', { itemId: input.itemId })
      .andWhere('layer.warehouseId = :warehouseId', {
        warehouseId: input.warehouseId,
      })
      .andWhere('layer.remainingQuantity > 0')
      .orderBy('layer.receivedDate', 'ASC')
      .addOrderBy('layer.createdAt', 'ASC')
      .addOrderBy('layer.id', 'ASC')
      .getMany();

    const allocations = this.allocator.allocate(layers, quantity);
    const layerById = new Map(layers.map((layer) => [layer.id, layer]));
    const allocationRepository = manager.getRepository(
      FifoCostAllocationEntity,
    );

    for (const allocation of allocations) {
      const layer = layerById.get(allocation.costLayerId);
      if (!layer) {
        throw new NotFoundException('FIFO cost layer not found.');
      }

      layer.remainingQuantity = this.roundQuantity(
        layer.remainingQuantity - allocation.quantity,
      );
      layer.remainingValue = this.roundValue(
        layer.remainingValue - allocation.totalCost,
      );
      if (layer.remainingQuantity === 0) {
        layer.remainingValue = 0;
      }

      await manager.getRepository(FifoCostLayerEntity).save(layer);
      await allocationRepository.save(
        allocationRepository.create({
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          costLayerId: layer.id,
          issueSourceType: input.sourceType,
          issueSourceId: input.sourceId,
          issueSourceLineId: input.sourceLineId,
          quantity: allocation.quantity,
          unitCost: allocation.unitCost,
          totalCost: allocation.totalCost,
        }),
      );
    }

    const totalCost = this.roundValue(
      allocations.reduce((sum, allocation) => sum + allocation.totalCost, 0),
    );
    const unitCost = this.roundUnitCost(totalCost / quantity);
    const quantityAfter = this.roundQuantity(balance.quantity - quantity);
    const inventoryValueAfter = this.roundValue(
      balance.inventoryValue - totalCost,
    );
    if (inventoryValueAfter < 0) {
      throw new BadRequestException('FIFO issue would create negative value.');
    }
    const averageUnitCostAfter =
      quantityAfter === 0
        ? 0
        : this.roundUnitCost(inventoryValueAfter / quantityAfter);

    await this.updateBalance(manager, balance, {
      quantityAfter,
      averageUnitCostAfter,
      inventoryValueAfter,
    });

    return this.saveTransaction(
      manager,
      input,
      InventoryCostTransactionType.ISSUE,
      {
        quantity,
        unitCost,
        totalCost,
        quantityAfter,
        averageUnitCostAfter,
        inventoryValueAfter,
      },
    );
  }

  private async findExisting(
    manager: EntityManager,
    input: RecordFifoIssueInput,
    transactionType: InventoryCostTransactionType,
  ): Promise<InventoryCostTransactionEntity | null> {
    return manager.getRepository(InventoryCostTransactionEntity).findOne({
      where: {
        companyId: input.companyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceLineId: input.sourceLineId,
        transactionType,
      },
    });
  }

  private async assertReferences(
    manager: EntityManager,
    input: RecordFifoIssueInput,
  ): Promise<void> {
    const [item, warehouse] = await Promise.all([
      manager.getRepository(ItemEntity).findOne({
        where: { id: input.itemId, companyId: input.companyId },
      }),
      manager.getRepository(WarehouseEntity).findOne({
        where: { id: input.warehouseId, companyId: input.companyId },
      }),
    ]);

    if (!item) throw new NotFoundException('Item not found.');
    if (!warehouse) throw new NotFoundException('Warehouse not found.');
  }

  private async acquireBalanceLock(
    manager: EntityManager,
    input: RecordFifoIssueInput,
  ): Promise<void> {
    const lockKey = `${input.companyId}:${input.itemId}:${input.warehouseId}`;
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [lockKey],
    );
  }

  private async getOrCreateBalance(
    manager: EntityManager,
    input: RecordFifoIssueInput,
  ): Promise<InventoryCostBalanceEntity> {
    const existing = await this.getBalanceForUpdate(manager, input);
    if (existing) return existing;

    const repository = manager.getRepository(InventoryCostBalanceEntity);
    return repository.save(
      repository.create({
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        quantity: 0,
        averageUnitCost: 0,
        inventoryValue: 0,
      }),
    );
  }

  private async getBalanceForUpdate(
    manager: EntityManager,
    input: RecordFifoIssueInput,
  ): Promise<InventoryCostBalanceEntity | null> {
    return manager
      .getRepository(InventoryCostBalanceEntity)
      .createQueryBuilder('balance')
      .setLock('pessimistic_write')
      .where('balance.companyId = :companyId', {
        companyId: input.companyId,
      })
      .andWhere('balance.itemId = :itemId', { itemId: input.itemId })
      .andWhere('balance.warehouseId = :warehouseId', {
        warehouseId: input.warehouseId,
      })
      .getOne();
  }

  private async updateBalance(
    manager: EntityManager,
    balance: InventoryCostBalanceEntity,
    calculated: {
      quantityAfter: number;
      averageUnitCostAfter: number;
      inventoryValueAfter: number;
    },
  ): Promise<void> {
    balance.quantity = calculated.quantityAfter;
    balance.averageUnitCost = calculated.averageUnitCostAfter;
    balance.inventoryValue = calculated.inventoryValueAfter;
    await manager.getRepository(InventoryCostBalanceEntity).save(balance);
  }

  private async saveTransaction(
    manager: EntityManager,
    input: RecordFifoIssueInput,
    transactionType: InventoryCostTransactionType,
    calculated: {
      quantity: number;
      unitCost: number;
      totalCost: number;
      quantityAfter: number;
      averageUnitCostAfter: number;
      inventoryValueAfter: number;
    },
  ): Promise<InventoryCostTransactionEntity> {
    const repository = manager.getRepository(InventoryCostTransactionEntity);
    return repository.save(
      repository.create({
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        transactionDate: input.transactionDate,
        transactionType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceLineId: input.sourceLineId,
        createdBy: input.createdBy ?? null,
        ...calculated,
      }),
    );
  }

  private assertPositive(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
  }

  private assertNonNegative(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${label} cannot be negative.`);
    }
  }

  private roundQuantity(value: number): number {
    return Number(value.toFixed(4));
  }

  private roundUnitCost(value: number): number {
    return Number(value.toFixed(6));
  }

  private roundValue(value: number): number {
    return Number(value.toFixed(4));
  }
}
