import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryCostTransactionType } from '../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';
import { InventoryAgingLineResponseDto } from './dto/inventory-aging-line-response.dto';
import { InventoryAgingPageResponseDto } from './dto/inventory-aging-page-response.dto';
import { InventoryAgingQueryDto } from './dto/inventory-aging-query.dto';
import { InventoryAgingSummaryResponseDto } from './dto/inventory-aging-summary-response.dto';
import {
  calculateRemainingFifoLayers,
  classifyInventoryAging,
  INVENTORY_AGING_BUCKET_KEYS,
  type InventoryAgingBuckets,
} from './inventory-aging.calculator';
import type { InventoryAgingMovement } from './interfaces/inventory-aging-layer.interface';

interface AgingRawRow {
  id: string;
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  transactionDate: Date | string;
  transactionType: InventoryCostTransactionType;
  quantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
}

interface AgingGroup {
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  movements: InventoryAgingMovement[];
}

@Injectable()
export class InventoryAgingService {
  constructor(
    @InjectRepository(InventoryCostTransactionEntity)
    private readonly transactionRepository: Repository<InventoryCostTransactionEntity>,
  ) {}

  async getAging(
    companyId: string,
    query: InventoryAgingQueryDto,
  ): Promise<InventoryAgingPageResponseDto> {
    const asOfDate = this.toEndOfDay(query.asOfDate);
    const rows = await this.loadMovements(companyId, query, asOfDate);
    const lines = this.buildLines(rows, asOfDate)
      .sort((left, right) =>
        left.itemName.localeCompare(right.itemName)
        || left.warehouseName.localeCompare(right.warehouseName),
      );

    const total = lines.length;
    const start = (query.page - 1) * query.limit;
    return {
      data: lines.slice(start, start + query.limit),
      summary: this.buildSummary(lines),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  private async loadMovements(
    companyId: string,
    query: InventoryAgingQueryDto,
    asOfDate: Date,
  ): Promise<AgingRawRow[]> {
    const builder = this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin(
        'items',
        'item',
        'item.id = transaction.itemId AND item.company_id = :companyId AND item.deleted_at IS NULL',
      )
      .innerJoin(
        'warehouses',
        'warehouse',
        'warehouse.id = transaction.warehouseId AND warehouse.company_id = :companyId AND warehouse.deleted_at IS NULL',
      )
      .select([
        'transaction.id AS "id"',
        'transaction.itemId AS "itemId"',
        'item.name AS "itemName"',
        'item.sku AS "sku"',
        'item.unit AS "unit"',
        'transaction.warehouseId AS "warehouseId"',
        'warehouse.warehouseCode AS "warehouseCode"',
        'warehouse.name AS "warehouseName"',
        'transaction.transactionDate AS "transactionDate"',
        'transaction.transactionType AS "transactionType"',
        'transaction.quantity AS "quantity"',
        'transaction.unitCost AS "unitCost"',
        'transaction.totalCost AS "totalCost"',
      ])
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.transactionDate <= :asOfDate', { asOfDate })
      .andWhere('transaction.transactionType IN (:...supportedTypes)', {
        supportedTypes: [...this.inboundTypes, ...this.outboundTypes],
      })
      .orderBy('transaction.transactionDate', 'ASC')
      .addOrderBy('transaction.id', 'ASC');

    if (query.itemId) builder.andWhere('transaction.itemId = :itemId', { itemId: query.itemId });
    if (query.warehouseId) {
      builder.andWhere('transaction.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    }

    return builder.getRawMany<AgingRawRow>();
  }

  private buildLines(rows: readonly AgingRawRow[], asOfDate: Date): InventoryAgingLineResponseDto[] {
    const groups = new Map<string, AgingGroup>();

    for (const row of rows) {
      const key = `${row.itemId}:${row.warehouseId}`;
      const existing = groups.get(key) ?? {
        itemId: row.itemId,
        itemName: row.itemName,
        sku: row.sku,
        unit: row.unit,
        warehouseId: row.warehouseId,
        warehouseCode: row.warehouseCode,
        warehouseName: row.warehouseName,
        movements: [],
      };
      existing.movements.push({
        id: row.id,
        transactionDate: new Date(row.transactionDate),
        quantity: Number(row.quantity),
        unitCost: Number(row.unitCost),
        totalCost: Number(row.totalCost),
        direction: this.inboundTypes.includes(row.transactionType) ? 'in' : 'out',
      });
      groups.set(key, existing);
    }

    const lines: InventoryAgingLineResponseDto[] = [];
    for (const group of groups.values()) {
      const layers = calculateRemainingFifoLayers(group.movements);
      if (layers.length === 0) continue;
      const buckets = classifyInventoryAging(layers, asOfDate);
      const totalQuantity = layers.reduce((sum, layer) => sum + layer.quantity, 0);
      const totalValue = layers.reduce((sum, layer) => sum + layer.value, 0);
      lines.push({
        itemId: group.itemId,
        itemName: group.itemName,
        sku: group.sku,
        unit: group.unit,
        warehouseId: group.warehouseId,
        warehouseCode: group.warehouseCode,
        warehouseName: group.warehouseName,
        totalQuantity: this.round4(totalQuantity),
        totalValue: this.round4(totalValue),
        ...buckets,
      });
    }
    return lines;
  }

  private buildSummary(lines: readonly InventoryAgingLineResponseDto[]): InventoryAgingSummaryResponseDto {
    const buckets: InventoryAgingBuckets = {
      days0To30: { quantity: 0, value: 0 },
      days31To60: { quantity: 0, value: 0 },
      days61To90: { quantity: 0, value: 0 },
      days91To180: { quantity: 0, value: 0 },
      days181To365: { quantity: 0, value: 0 },
      daysOver365: { quantity: 0, value: 0 },
    };

    for (const line of lines) {
      for (const key of INVENTORY_AGING_BUCKET_KEYS) {
        buckets[key].quantity = this.round4(buckets[key].quantity + line[key].quantity);
        buckets[key].value = this.round4(buckets[key].value + line[key].value);
      }
    }

    return {
      distinctItems: new Set(lines.map((line) => line.itemId)).size,
      warehouseBalances: lines.length,
      totalQuantity: this.round4(lines.reduce((sum, line) => sum + line.totalQuantity, 0)),
      totalValue: this.round4(lines.reduce((sum, line) => sum + line.totalValue, 0)),
      ...buckets,
    };
  }

  private get inboundTypes(): InventoryCostTransactionType[] {
    return [
      InventoryCostTransactionType.RECEIPT,
      InventoryCostTransactionType.ADJUSTMENT_IN,
      InventoryCostTransactionType.LANDED_COST,
    ];
  }

  private get outboundTypes(): InventoryCostTransactionType[] {
    return [
      InventoryCostTransactionType.ISSUE,
      InventoryCostTransactionType.ADJUSTMENT_OUT,
      InventoryCostTransactionType.REVERSAL,
    ];
  }

  private toEndOfDay(value?: string): Date {
    const date = value ? new Date(`${value}T23:59:59.999Z`) : new Date();
    if (Number.isNaN(date.getTime())) throw new Error('Invalid inventory aging date.');
    return date;
  }

  private round4(value: number): number {
    return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  }
}
