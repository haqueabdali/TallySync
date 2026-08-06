import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ItemEntity } from '../../inventory/entities/item.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { InventoryCostBalanceEntity } from '../entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../entities/inventory-cost-transaction.entity';
import { InventoryCostTransactionType } from '../enums/inventory-cost-transaction-type.enum';
import type {
  MovingAverageExecutionOptions,
  RecordMovingAverageIssueInput,
  RecordMovingAverageReceiptInput,
} from './interfaces/moving-average-transaction.interface';
import { MovingAverageCalculator } from './moving-average-calculator';

@Injectable()
export class MovingAverageCostingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly calculator: MovingAverageCalculator,
  ) {}

  async recordReceipt(
    input: RecordMovingAverageReceiptInput,
    options: MovingAverageExecutionOptions = {},
  ): Promise<InventoryCostTransactionEntity> {
    if (options.manager) {
      return this.recordReceiptWithManager(options.manager, input);
    }

    return this.dataSource.transaction((manager) =>
      this.recordReceiptWithManager(manager, input),
    );
  }

  async recordIssue(
    input: RecordMovingAverageIssueInput,
    options: MovingAverageExecutionOptions = {},
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
    input: RecordMovingAverageReceiptInput,
  ): Promise<InventoryCostTransactionEntity> {
    const existing = await this.findExisting(
      manager,
      input,
      InventoryCostTransactionType.RECEIPT,
    );
    if (existing) return existing;

    await this.assertReferences(manager, input);
    await this.acquireBalanceLock(manager, input);
    const balance = await this.getOrCreateBalance(manager, input);
    const calculated = this.calculator.calculateReceipt(
      balance,
      input.quantity,
      input.unitCost,
    );

    await this.updateBalance(manager, balance, calculated);
    return this.saveTransaction(
      manager,
      input,
      InventoryCostTransactionType.RECEIPT,
      calculated,
    );
  }

  private async recordIssueWithManager(
    manager: EntityManager,
    input: RecordMovingAverageIssueInput,
  ): Promise<InventoryCostTransactionEntity> {
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

    const calculated = this.calculator.calculateIssue(balance, input.quantity);
    await this.updateBalance(manager, balance, calculated);
    return this.saveTransaction(
      manager,
      input,
      InventoryCostTransactionType.ISSUE,
      calculated,
    );
  }

  private async findExisting(
    manager: EntityManager,
    input: RecordMovingAverageIssueInput,
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
    input: RecordMovingAverageIssueInput,
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
    input: RecordMovingAverageIssueInput,
  ): Promise<void> {
    const lockKey = `${input.companyId}:${input.itemId}:${input.warehouseId}`;
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [lockKey],
    );
  }

  private async getOrCreateBalance(
    manager: EntityManager,
    input: RecordMovingAverageIssueInput,
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
    input: RecordMovingAverageIssueInput,
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
    input: RecordMovingAverageIssueInput,
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
}
