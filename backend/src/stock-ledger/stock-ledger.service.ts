import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryCostTransactionType } from '../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';
import { StockLedgerEntryResponseDto } from './dto/stock-ledger-entry-response.dto';
import { StockLedgerPageResponseDto } from './dto/stock-ledger-page-response.dto';
import { StockLedgerQueryDto } from './dto/stock-ledger-query.dto';
import { StockLedgerSummaryResponseDto } from './dto/stock-ledger-summary-response.dto';

interface StockLedgerAggregateRow {
  quantityIn: string | null;
  valueIn: string | null;
  quantityOut: string | null;
  valueOut: string | null;
}

interface StockLedgerOpeningRow {
  quantity: string | null;
  value: string | null;
}

@Injectable()
export class StockLedgerService {
  constructor(
    @InjectRepository(InventoryCostTransactionEntity)
    private readonly transactionRepository: Repository<InventoryCostTransactionEntity>,
  ) {}

  async findAll(companyId: string, query: StockLedgerQueryDto): Promise<StockLedgerPageResponseDto> {
    this.validateDateRange(query);
    const builder = this.createFilteredQuery(companyId, query);
    const total = await builder.getCount();
    const order = query.oldestFirst ? 'ASC' : 'DESC';
    const rows = await builder
      .orderBy('transaction.transactionDate', order)
      .addOrderBy('transaction.createdAt', order)
      .addOrderBy('transaction.id', order)
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      data: rows.map((row) => this.toResponse(row)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async getSummary(companyId: string, query: StockLedgerQueryDto): Promise<StockLedgerSummaryResponseDto> {
    this.validateDateRange(query);
    const opening = await this.getOpening(companyId, query);
    const aggregate = await this.createFilteredQuery(companyId, query)
      .select([
        `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...inboundTypes) THEN transaction.quantity ELSE 0 END), 0) AS "quantityIn"`,
        `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...inboundTypes) THEN transaction.totalCost ELSE 0 END), 0) AS "valueIn"`,
        `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...outboundTypes) THEN transaction.quantity ELSE 0 END), 0) AS "quantityOut"`,
        `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...outboundTypes) THEN transaction.totalCost ELSE 0 END), 0) AS "valueOut"`,
      ])
      .setParameters({
        inboundTypes: this.inboundTypes,
        outboundTypes: this.outboundTypes,
      })
      .getRawOne<StockLedgerAggregateRow>();

    const quantityIn = Number(aggregate?.quantityIn ?? 0);
    const valueIn = Number(aggregate?.valueIn ?? 0);
    const quantityOut = Number(aggregate?.quantityOut ?? 0);
    const valueOut = Number(aggregate?.valueOut ?? 0);
    const closingQuantity = this.round4(opening.quantity + quantityIn - quantityOut);
    const closingValue = this.round4(opening.value + valueIn - valueOut);

    return {
      openingQuantity: opening.quantity,
      openingValue: opening.value,
      quantityIn,
      valueIn,
      quantityOut,
      valueOut,
      closingQuantity,
      closingValue,
      closingAverageUnitCost: closingQuantity === 0 ? 0 : this.round6(closingValue / closingQuantity),
    };
  }

  private createFilteredQuery(
    companyId: string,
    query: StockLedgerQueryDto,
  ): SelectQueryBuilder<InventoryCostTransactionEntity> {
    const builder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId });

    if (query.itemId) builder.andWhere('transaction.itemId = :itemId', { itemId: query.itemId });
    if (query.warehouseId) builder.andWhere('transaction.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    if (query.fromDate) builder.andWhere('transaction.transactionDate >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) builder.andWhere('transaction.transactionDate <= :toDate', { toDate: query.toDate });
    if (query.sourceType) builder.andWhere('transaction.sourceType = :sourceType', { sourceType: query.sourceType });
    if (query.transactionType) builder.andWhere('transaction.transactionType = :transactionType', { transactionType: query.transactionType });

    return builder;
  }

  private async getOpening(
    companyId: string,
    query: StockLedgerQueryDto,
  ): Promise<{ quantity: number; value: number }> {
    if (!query.fromDate) return { quantity: 0, value: 0 };

    const builder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...inboundTypes) THEN transaction.quantity ELSE -transaction.quantity END), 0) AS "quantity"`,
        `COALESCE(SUM(CASE WHEN transaction.transactionType IN (:...inboundTypes) THEN transaction.totalCost ELSE -transaction.totalCost END), 0) AS "value"`,
      ])
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.transactionDate < :fromDate', { fromDate: query.fromDate })
      .andWhere(new Brackets((where) => {
        where.where('transaction.transactionType IN (:...inboundTypes)')
          .orWhere('transaction.transactionType IN (:...outboundTypes)');
      }))
      .setParameters({ inboundTypes: this.inboundTypes, outboundTypes: this.outboundTypes });

    if (query.itemId) builder.andWhere('transaction.itemId = :itemId', { itemId: query.itemId });
    if (query.warehouseId) builder.andWhere('transaction.warehouseId = :warehouseId', { warehouseId: query.warehouseId });

    const row = await builder.getRawOne<StockLedgerOpeningRow>();
    return { quantity: Number(row?.quantity ?? 0), value: Number(row?.value ?? 0) };
  }

  private toResponse(row: InventoryCostTransactionEntity): StockLedgerEntryResponseDto {
    const inbound = this.inboundTypes.includes(row.transactionType);
    return {
      id: row.id,
      itemId: row.itemId,
      warehouseId: row.warehouseId,
      transactionDate: row.transactionDate,
      transactionType: row.transactionType,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceLineId: row.sourceLineId,
      quantityIn: inbound ? row.quantity : 0,
      quantityOut: inbound ? 0 : row.quantity,
      unitCost: row.unitCost,
      valueIn: inbound ? row.totalCost : 0,
      valueOut: inbound ? 0 : row.totalCost,
      quantityBalance: row.quantityAfter,
      averageUnitCost: row.averageUnitCostAfter,
      inventoryValue: row.inventoryValueAfter,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  private validateDateRange(query: StockLedgerQueryDto): void {
    if (query.fromDate && query.toDate && query.fromDate > query.toDate) {
      throw new BadRequestException('fromDate cannot be later than toDate.');
    }
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

  private round6(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }
}
