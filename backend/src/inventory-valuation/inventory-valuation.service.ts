import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryCostBalanceEntity } from '../inventory-cost-engine/entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryCostTransactionType } from '../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';
import { InventoryValuationLineResponseDto } from './dto/inventory-valuation-line-response.dto';
import { InventoryValuationPageResponseDto } from './dto/inventory-valuation-page-response.dto';
import { InventoryValuationQueryDto } from './dto/inventory-valuation-query.dto';
import { InventoryValuationSummaryResponseDto } from './dto/inventory-valuation-summary-response.dto';
import { calculateInventoryValuation } from './inventory-valuation.calculator';

interface CurrentValuationRow {
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: string | number;
  averageUnitCost: string | number;
  inventoryValue: string | number;
}

interface HistoricalValuationRow {
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: string | number;
  inventoryValue: string | number;
}

interface CountRow {
  count: string | number;
}

interface SummaryRow {
  distinctItems: string | number;
  warehouseBalances: string | number;
  totalQuantity: string | number;
  totalInventoryValue: string | number;
}

@Injectable()
export class InventoryValuationService {
  constructor(
    @InjectRepository(InventoryCostBalanceEntity)
    private readonly balanceRepository: Repository<InventoryCostBalanceEntity>,
    @InjectRepository(InventoryCostTransactionEntity)
    private readonly transactionRepository: Repository<InventoryCostTransactionEntity>,
  ) {}

  async getValuation(
    companyId: string,
    query: InventoryValuationQueryDto,
  ): Promise<InventoryValuationPageResponseDto> {
    return query.asOfDate
      ? this.getHistoricalValuation(companyId, query)
      : this.getCurrentValuation(companyId, query);
  }

  private async getCurrentValuation(
    companyId: string,
    query: InventoryValuationQueryDto,
  ): Promise<InventoryValuationPageResponseDto> {
    const base = this.createCurrentBaseQuery(companyId, query);
    const countRow = await base.clone().select('COUNT(*)', 'count').getRawOne<CountRow>();
    const total = Number(countRow?.count ?? 0);

    const rows = await base
      .clone()
      .select([
        'balance.itemId AS "itemId"',
        'item.name AS "itemName"',
        'item.sku AS "sku"',
        'item.unit AS "unit"',
        'balance.warehouseId AS "warehouseId"',
        'warehouse.warehouseCode AS "warehouseCode"',
        'warehouse.name AS "warehouseName"',
        'balance.quantity AS "quantity"',
        'balance.averageUnitCost AS "averageUnitCost"',
        'balance.inventoryValue AS "inventoryValue"',
      ])
      .orderBy('item.name', 'ASC')
      .addOrderBy('warehouse.name', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getRawMany<CurrentValuationRow>();

    const summary = await this.getCurrentSummary(base);
    return this.toPage(rows.map((row) => this.mapCurrentRow(row)), summary, total, query);
  }

  private createCurrentBaseQuery(
    companyId: string,
    query: InventoryValuationQueryDto,
  ): SelectQueryBuilder<InventoryCostBalanceEntity> {
    const builder = this.balanceRepository
      .createQueryBuilder('balance')
      .innerJoin('items', 'item', 'item.id = balance.itemId AND item.company_id = :companyId AND item.deleted_at IS NULL')
      .innerJoin('warehouses', 'warehouse', 'warehouse.id = balance.warehouseId AND warehouse.company_id = :companyId AND warehouse.deleted_at IS NULL')
      .where('balance.companyId = :companyId', { companyId });

    if (query.itemId) builder.andWhere('balance.itemId = :itemId', { itemId: query.itemId });
    if (query.warehouseId) builder.andWhere('balance.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    if (!query.includeZeroQuantity) builder.andWhere('balance.quantity <> 0');

    return builder;
  }

  private async getCurrentSummary(
    base: SelectQueryBuilder<InventoryCostBalanceEntity>,
  ): Promise<InventoryValuationSummaryResponseDto> {
    const row = await base
      .clone()
      .select([
        'COUNT(DISTINCT balance.itemId) AS "distinctItems"',
        'COUNT(*) AS "warehouseBalances"',
        'COALESCE(SUM(balance.quantity), 0) AS "totalQuantity"',
        'COALESCE(SUM(balance.inventoryValue), 0) AS "totalInventoryValue"',
      ])
      .getRawOne<SummaryRow>();

    return this.mapSummary(row);
  }

  private async getHistoricalValuation(
    companyId: string,
    query: InventoryValuationQueryDto,
  ): Promise<InventoryValuationPageResponseDto> {
    const grouped = this.createHistoricalGroupedQuery(companyId, query);
    const countRow = await this.transactionRepository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(`(${grouped.getQuery()})`, 'valuation')
      .setParameters(grouped.getParameters())
      .getRawOne<CountRow>();
    const total = Number(countRow?.count ?? 0);

    const pageQuery = this.transactionRepository.manager
      .createQueryBuilder()
      .select('*')
      .from(`(${grouped.getQuery()})`, 'valuation')
      .setParameters(grouped.getParameters())
      .orderBy('valuation."itemName"', 'ASC')
      .addOrderBy('valuation."warehouseName"', 'ASC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit);

    const rows = await pageQuery.getRawMany<HistoricalValuationRow>();
    const summary = await this.getHistoricalSummary(grouped);
    return this.toPage(rows.map((row) => this.mapHistoricalRow(row)), summary, total, query);
  }

  private createHistoricalGroupedQuery(
    companyId: string,
    query: InventoryValuationQueryDto,
  ): SelectQueryBuilder<InventoryCostTransactionEntity> {
    const signedQuantity = `CASE
      WHEN transaction.transactionType IN (:...inboundTypes) THEN transaction.quantity
      WHEN transaction.transactionType IN (:...outboundTypes) THEN -transaction.quantity
      ELSE 0
    END`;
    const signedValue = `CASE
      WHEN transaction.transactionType IN (:...inboundTypes) THEN transaction.totalCost
      WHEN transaction.transactionType IN (:...outboundTypes) THEN -transaction.totalCost
      ELSE 0
    END`;

    const builder = this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('items', 'item', 'item.id = transaction.itemId AND item.company_id = :companyId AND item.deleted_at IS NULL')
      .innerJoin('warehouses', 'warehouse', 'warehouse.id = transaction.warehouseId AND warehouse.company_id = :companyId AND warehouse.deleted_at IS NULL')
      .select([
        'transaction.itemId AS "itemId"',
        'item.name AS "itemName"',
        'item.sku AS "sku"',
        'item.unit AS "unit"',
        'transaction.warehouseId AS "warehouseId"',
        'warehouse.warehouseCode AS "warehouseCode"',
        'warehouse.name AS "warehouseName"',
        `SUM(${signedQuantity}) AS "quantity"`,
        `SUM(${signedValue}) AS "inventoryValue"`,
      ])
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.transactionDate <= :asOfDate', { asOfDate: query.asOfDate })
      .andWhere('transaction.transactionType IN (:...supportedTypes)')
      .setParameters({
        inboundTypes: this.inboundTypes,
        outboundTypes: this.outboundTypes,
        supportedTypes: [...this.inboundTypes, ...this.outboundTypes],
      })
      .groupBy('transaction.itemId')
      .addGroupBy('item.name')
      .addGroupBy('item.sku')
      .addGroupBy('item.unit')
      .addGroupBy('transaction.warehouseId')
      .addGroupBy('warehouse.warehouseCode')
      .addGroupBy('warehouse.name');

    if (query.itemId) builder.andWhere('transaction.itemId = :itemId', { itemId: query.itemId });
    if (query.warehouseId) builder.andWhere('transaction.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    if (!query.includeZeroQuantity) builder.having(`SUM(${signedQuantity}) <> 0`);

    return builder;
  }

  private async getHistoricalSummary(
    grouped: SelectQueryBuilder<InventoryCostTransactionEntity>,
  ): Promise<InventoryValuationSummaryResponseDto> {
    const row = await this.transactionRepository.manager
      .createQueryBuilder()
      .select([
        'COUNT(DISTINCT valuation."itemId") AS "distinctItems"',
        'COUNT(*) AS "warehouseBalances"',
        'COALESCE(SUM(valuation.quantity), 0) AS "totalQuantity"',
        'COALESCE(SUM(valuation."inventoryValue"), 0) AS "totalInventoryValue"',
      ])
      .from(`(${grouped.getQuery()})`, 'valuation')
      .setParameters(grouped.getParameters())
      .getRawOne<SummaryRow>();

    return this.mapSummary(row);
  }

  private mapCurrentRow(row: CurrentValuationRow): InventoryValuationLineResponseDto {
    return {
      itemId: row.itemId,
      itemName: row.itemName,
      sku: row.sku,
      unit: row.unit,
      warehouseId: row.warehouseId,
      warehouseCode: row.warehouseCode,
      warehouseName: row.warehouseName,
      quantity: Number(row.quantity),
      averageUnitCost: Number(row.averageUnitCost),
      inventoryValue: Number(row.inventoryValue),
    };
  }

  private mapHistoricalRow(row: HistoricalValuationRow): InventoryValuationLineResponseDto {
    const valuation = calculateInventoryValuation(Number(row.quantity), Number(row.inventoryValue));
    return {
      itemId: row.itemId,
      itemName: row.itemName,
      sku: row.sku,
      unit: row.unit,
      warehouseId: row.warehouseId,
      warehouseCode: row.warehouseCode,
      warehouseName: row.warehouseName,
      ...valuation,
    };
  }

  private mapSummary(row: SummaryRow | undefined): InventoryValuationSummaryResponseDto {
    return {
      distinctItems: Number(row?.distinctItems ?? 0),
      warehouseBalances: Number(row?.warehouseBalances ?? 0),
      totalQuantity: this.round4(Number(row?.totalQuantity ?? 0)),
      totalInventoryValue: this.round4(Number(row?.totalInventoryValue ?? 0)),
    };
  }

  private toPage(
    data: InventoryValuationLineResponseDto[],
    summary: InventoryValuationSummaryResponseDto,
    total: number,
    query: InventoryValuationQueryDto,
  ): InventoryValuationPageResponseDto {
    return {
      data,
      summary,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
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

  private round4(value: number): number {
    return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  }
}
