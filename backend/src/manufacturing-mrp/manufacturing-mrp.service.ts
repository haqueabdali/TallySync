import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryCostBalanceEntity } from '../inventory-cost-engine/entities/inventory-cost-balance.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { MrpPlanPageResponseDto } from './dto/mrp-plan-page-response.dto';
import { MrpPlanQueryDto } from './dto/mrp-plan-query.dto';
import { calculateMrpRecommendation } from './mrp-planning.calculator';

interface RawMrpRow {
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHandQuantity: string | number;
  reorderLevel: string | number;
  averageUnitCost: string | number;
}

interface RawMrpSummary {
  itemWarehouseCount: string | number;
  shortageCount: string | number;
  totalShortageQuantity: string | number | null;
  totalRecommendedReplenishmentQuantity: string | number | null;
  estimatedReplenishmentValue: string | number | null;
}

@Injectable()
export class ManufacturingMrpService {
  constructor(
    @InjectRepository(InventoryCostBalanceEntity)
    private readonly balanceRepository: Repository<InventoryCostBalanceEntity>,
  ) {}

  async getPlan(
    companyId: string,
    query: MrpPlanQueryDto,
  ): Promise<MrpPlanPageResponseDto> {
    const baseQuery = this.createBaseQuery(companyId, query);
    const total = await baseQuery.clone().getCount();

    const rows = await baseQuery
      .clone()
      .select([
        'item.id AS "itemId"',
        'item.name AS "itemName"',
        'item.sku AS "sku"',
        'item.unit AS "unit"',
        'warehouse.id AS "warehouseId"',
        'warehouse.warehouseCode AS "warehouseCode"',
        'warehouse.name AS "warehouseName"',
        'balance.quantity AS "onHandQuantity"',
        'item.reorderLevel AS "reorderLevel"',
        'balance.averageUnitCost AS "averageUnitCost"',
      ])
      .orderBy('item.name', 'ASC')
      .addOrderBy('warehouse.name', 'ASC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<RawMrpRow>();

    const summary = await this.getSummary(baseQuery);

    return {
      data: rows.map((row) => {
        const onHandQuantity = Number(row.onHandQuantity);
        const reorderLevel = Number(row.reorderLevel);
        const averageUnitCost = Number(row.averageUnitCost);
        const calculated = calculateMrpRecommendation({
          onHandQuantity,
          reorderLevel,
          averageUnitCost,
        });

        return {
          itemId: row.itemId,
          itemName: row.itemName,
          sku: row.sku,
          unit: row.unit,
          warehouseId: row.warehouseId,
          warehouseCode: row.warehouseCode,
          warehouseName: row.warehouseName,
          onHandQuantity,
          reorderLevel,
          averageUnitCost,
          ...calculated,
        };
      }),
      summary,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  private createBaseQuery(
    companyId: string,
    query: MrpPlanQueryDto,
  ): SelectQueryBuilder<InventoryCostBalanceEntity> {
    const builder = this.balanceRepository
      .createQueryBuilder('balance')
      .innerJoin(
        ItemEntity,
        'item',
        'item.id = balance.itemId AND item.companyId = :companyId AND item.deletedAt IS NULL',
        { companyId },
      )
      .innerJoin(
        WarehouseEntity,
        'warehouse',
        'warehouse.id = balance.warehouseId AND warehouse.companyId = :companyId AND warehouse.deletedAt IS NULL AND warehouse.isActive = true',
        { companyId },
      )
      .where('balance.companyId = :companyId', { companyId });

    if (query.itemId) {
      builder.andWhere('balance.itemId = :itemId', { itemId: query.itemId });
    }

    if (query.warehouseId) {
      builder.andWhere('balance.warehouseId = :warehouseId', {
        warehouseId: query.warehouseId,
      });
    }

    if (query.shortagesOnly) {
      builder.andWhere('balance.quantity < item.reorderLevel');
    }

    return builder;
  }

  private async getSummary(
    baseQuery: SelectQueryBuilder<InventoryCostBalanceEntity>,
  ): Promise<MrpPlanPageResponseDto['summary']> {
    const summary = await baseQuery
      .clone()
      .select('COUNT(*)', 'itemWarehouseCount')
      .addSelect(
        'COUNT(*) FILTER (WHERE balance.quantity < item.reorderLevel)',
        'shortageCount',
      )
      .addSelect(
        'COALESCE(SUM(GREATEST(item.reorderLevel - balance.quantity, 0)), 0)',
        'totalShortageQuantity',
      )
      .addSelect(
        'COALESCE(SUM(GREATEST(item.reorderLevel - balance.quantity, 0)), 0)',
        'totalRecommendedReplenishmentQuantity',
      )
      .addSelect(
        'COALESCE(SUM(GREATEST(item.reorderLevel - balance.quantity, 0) * balance.averageUnitCost), 0)',
        'estimatedReplenishmentValue',
      )
      .getRawOne<RawMrpSummary>();

    return {
      itemWarehouseCount: Number(summary?.itemWarehouseCount ?? 0),
      shortageCount: Number(summary?.shortageCount ?? 0),
      totalShortageQuantity: Number(summary?.totalShortageQuantity ?? 0),
      totalRecommendedReplenishmentQuantity: Number(
        summary?.totalRecommendedReplenishmentQuantity ?? 0,
      ),
      estimatedReplenishmentValue: Number(
        summary?.estimatedReplenishmentValue ?? 0,
      ),
    };
  }
}
