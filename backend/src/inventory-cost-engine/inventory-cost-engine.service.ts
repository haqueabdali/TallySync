import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ItemEntity } from '../inventory/entities/item.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { InventoryCostBalanceResponseDto } from './dto/inventory-cost-balance-response.dto';
import { InventoryCostTransactionResponseDto } from './dto/inventory-cost-transaction-response.dto';
import { InventoryCostBalanceEntity } from './entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from './entities/inventory-cost-transaction.entity';
import { InventoryCostTransactionType } from './enums/inventory-cost-transaction-type.enum';
import type { InventoryCostExecutionOptions, RecordInventoryCostTransactionInput } from './interfaces/record-inventory-cost-transaction.interface';

@Injectable()
export class InventoryCostEngineService {
  constructor(
    @InjectRepository(InventoryCostBalanceEntity) private readonly balanceRepository: Repository<InventoryCostBalanceEntity>,
    @InjectRepository(InventoryCostTransactionEntity) private readonly transactionRepository: Repository<InventoryCostTransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async record(input: RecordInventoryCostTransactionInput, options: InventoryCostExecutionOptions = {}): Promise<InventoryCostTransactionEntity> {
    this.validateInput(input);
    if (options.manager) return this.recordWithManager(options.manager, input);
    return this.dataSource.transaction((manager) => this.recordWithManager(manager, input));
  }

  async getBalance(companyId: string, itemId: string, warehouseId: string): Promise<InventoryCostBalanceResponseDto> {
    const balance = await this.balanceRepository.findOne({ where: { companyId, itemId, warehouseId } });
    if (!balance) throw new NotFoundException('Inventory cost balance not found.');
    return { ...balance };
  }

  async getTransactions(companyId: string, itemId: string, warehouseId: string): Promise<InventoryCostTransactionResponseDto[]> {
    const rows = await this.transactionRepository.find({
      where: { companyId, itemId, warehouseId },
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id, transactionType: row.transactionType, sourceType: row.sourceType,
      sourceId: row.sourceId, sourceLineId: row.sourceLineId, transactionDate: row.transactionDate,
      quantity: row.quantity, unitCost: row.unitCost, totalCost: row.totalCost,
      quantityAfter: row.quantityAfter, averageUnitCostAfter: row.averageUnitCostAfter,
      inventoryValueAfter: row.inventoryValueAfter, createdAt: row.createdAt,
    }));
  }

  private async recordWithManager(manager: EntityManager, input: RecordInventoryCostTransactionInput): Promise<InventoryCostTransactionEntity> {
    const transactionRepository = manager.getRepository(InventoryCostTransactionEntity);
    const existing = await transactionRepository.findOne({ where: {
      companyId: input.companyId, sourceType: input.sourceType, sourceId: input.sourceId,
      sourceLineId: input.sourceLineId, transactionType: input.transactionType,
    }});
    if (existing) return existing;

    await this.assertReferences(manager, input);
    const balanceRepository = manager.getRepository(InventoryCostBalanceEntity);
    let balance = await balanceRepository.createQueryBuilder('balance').setLock('pessimistic_write')
      .where('balance.companyId = :companyId', { companyId: input.companyId })
      .andWhere('balance.itemId = :itemId', { itemId: input.itemId })
      .andWhere('balance.warehouseId = :warehouseId', { warehouseId: input.warehouseId }).getOne();
    if (!balance) {
      balance = await balanceRepository.save(balanceRepository.create({
        companyId: input.companyId, itemId: input.itemId, warehouseId: input.warehouseId,
        quantity: 0, averageUnitCost: 0, inventoryValue: 0,
      }));
    }

    const direction = this.isInbound(input.transactionType) ? 1 : -1;
    const quantityAfter = this.round4(balance.quantity + direction * input.quantity);
    if (quantityAfter < 0) throw new ConflictException('Inventory cost transaction would create negative warehouse stock.');
    const totalCost = this.round4(input.quantity * input.unitCost);
    const inventoryValueAfter = this.round4(balance.inventoryValue + direction * totalCost);
    if (inventoryValueAfter < 0) throw new ConflictException('Inventory cost transaction would create negative inventory value.');
    const averageUnitCostAfter = quantityAfter === 0 ? 0 : this.round6(inventoryValueAfter / quantityAfter);

    balance.quantity = quantityAfter;
    balance.inventoryValue = inventoryValueAfter;
    balance.averageUnitCost = averageUnitCostAfter;
    await balanceRepository.save(balance);

    return transactionRepository.save(transactionRepository.create({
      ...input, createdBy: input.createdBy ?? null, totalCost, quantityAfter,
      averageUnitCostAfter, inventoryValueAfter,
    }));
  }

  private async assertReferences(manager: EntityManager, input: RecordInventoryCostTransactionInput): Promise<void> {
    const [item, warehouse] = await Promise.all([
      manager.getRepository(ItemEntity).findOne({ where: { id: input.itemId, companyId: input.companyId } }),
      manager.getRepository(WarehouseEntity).findOne({ where: { id: input.warehouseId, companyId: input.companyId } }),
    ]);
    if (!item) throw new NotFoundException('Item not found.');
    if (!warehouse) throw new NotFoundException('Warehouse not found.');
  }

  private validateInput(input: RecordInventoryCostTransactionInput): void {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new BadRequestException('Quantity must be greater than zero.');
    if (!Number.isFinite(input.unitCost) || input.unitCost < 0) throw new BadRequestException('Unit cost cannot be negative.');
  }

  private isInbound(type: InventoryCostTransactionType): boolean {
    return type === InventoryCostTransactionType.RECEIPT || type === InventoryCostTransactionType.ADJUSTMENT_IN || type === InventoryCostTransactionType.LANDED_COST;
  }
  private round4(value: number): number { return Math.round((value + Number.EPSILON) * 10_000) / 10_000; }
  private round6(value: number): number { return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000; }
}
