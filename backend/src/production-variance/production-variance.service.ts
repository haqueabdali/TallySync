import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { MaterialConsumptionLineEntity } from '../material-consumption/entities/material-consumption-line.entity';
import { WipPostingEntity } from '../manufacturing-wip-accounting/entities/wip-posting.entity';
import { WipPostingType } from '../manufacturing-wip-accounting/enums/wip-posting-type.enum';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { ProductionOrderStatus } from '../production-orders/enums/production-order-status.enum';
import { CalculateProductionVarianceDto } from './dto/calculate-production-variance.dto';
import { ProductionVarianceFilterDto } from './dto/production-variance-filter.dto';
import { UpsertProductionVarianceSettingsDto } from './dto/upsert-production-variance-settings.dto';
import { ProductionVarianceLineEntity } from './entities/production-variance-line.entity';
import { ProductionVarianceSettingsEntity } from './entities/production-variance-settings.entity';
import { ProductionVarianceEntity } from './entities/production-variance.entity';
import { ProductionVarianceStatus } from './enums/production-variance-status.enum';

@Injectable()
export class ProductionVarianceService {
  constructor(
    @InjectRepository(AccountingSettingsEntity)
    private readonly accountingSettingsRepository:
      Repository<AccountingSettingsEntity>,

    private readonly accountingEngineService:
      AccountingEngineService,

    @InjectRepository(ProductionVarianceSettingsEntity)
    private readonly settingsRepository:
      Repository<ProductionVarianceSettingsEntity>,

    @InjectRepository(ProductionVarianceEntity)
    private readonly varianceRepository:
      Repository<ProductionVarianceEntity>,

    @InjectRepository(ProductionVarianceLineEntity)
    private readonly lineRepository:
      Repository<ProductionVarianceLineEntity>,

    @InjectRepository(ProductionOrderEntity)
    private readonly productionOrderRepository:
      Repository<ProductionOrderEntity>,

    @InjectRepository(MaterialConsumptionLineEntity)
    private readonly consumptionLineRepository:
      Repository<MaterialConsumptionLineEntity>,

    @InjectRepository(WipPostingEntity)
    private readonly wipPostingRepository:
      Repository<WipPostingEntity>,

    @InjectRepository(AccountEntity)
    private readonly accountRepository:
      Repository<AccountEntity>,
  ) {}

  async getSettings(
    companyId: string,
  ): Promise<ProductionVarianceSettingsEntity> {
    const settings =
      await this.settingsRepository.findOne({
        where: { companyId },
        relations: {
          favorableVarianceAccount: true,
          unfavorableVarianceAccount: true,
        },
      });

    if (!settings) {
      throw new NotFoundException(
        'Production variance settings are not configured.',
      );
    }

    return settings;
  }

  async upsertSettings(
    companyId: string,
    userId: string,
    dto: UpsertProductionVarianceSettingsDto,
  ): Promise<ProductionVarianceSettingsEntity> {
    if (
      dto.favorableVarianceAccountId ===
      dto.unfavorableVarianceAccountId
    ) {
      throw new BadRequestException(
        'Favorable and unfavorable variance accounts must be different.',
      );
    }

    await this.validateAccount(
      companyId,
      dto.favorableVarianceAccountId,
      AccountType.INCOME,
      'Favorable variance',
    );

    await this.validateAccount(
      companyId,
      dto.unfavorableVarianceAccountId,
      AccountType.EXPENSE,
      'Unfavorable variance',
    );

    const existing =
      await this.settingsRepository.findOne({
        where: { companyId },
      });

    const entity = existing
      ? this.settingsRepository.merge(
          existing,
          {
            ...dto,
            updatedBy: userId,
          },
        )
      : this.settingsRepository.create({
          companyId,
          ...dto,
          createdBy: userId,
          updatedBy: userId,
        });

    await this.settingsRepository.save(entity);

    return this.getSettings(companyId);
  }

  async calculate(
    companyId: string,
    userId: string,
    productionOrderId: string,
    dto: CalculateProductionVarianceDto,
  ): Promise<ProductionVarianceEntity> {
    const existing =
      await this.varianceRepository.findOne({
        where: {
          companyId,
          productionOrderId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Production variance has already been calculated for this production order.',
      );
    }

    const order =
      await this.productionOrderRepository.findOne({
        where: {
          id: productionOrderId,
          companyId,
        },
        relations: {
          components: true,
          finishedItem: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Production order not found.',
      );
    }

    if (
      order.status !==
      ProductionOrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Production variance can only be calculated for a completed production order.',
      );
    }

    const costs =
      await this.getWipCosts(
        companyId,
        productionOrderId,
      );

    const actualCosts =
      await this.getComponentActualCosts(
        productionOrderId,
      );

    const totalVariance =
      this.money(
        costs.materialCost -
          costs.finishedGoodsCost,
      );

    const lines =
      order.components.map(
        (component) =>
          this.lineRepository.create({
            productionOrderComponentId:
              component.id,
            itemId:
              component.componentItemId,
            requiredQuantity:
              Number(
                component.requiredQuantity,
              ),
            consumedQuantity:
              Number(
                component.consumedQuantity,
              ),
            quantityVariance:
              this.quantity(
                Number(
                  component.consumedQuantity,
                ) -
                  Number(
                    component.requiredQuantity,
                  ),
              ),
            actualCost:
              this.money(
                actualCosts.get(
                  component.id,
                ) ?? 0,
              ),
          }),
      );

    const variance =
      this.varianceRepository.create({
        companyId,
        productionOrderId,
        varianceDate:
          dto.varianceDate ??
          new Date()
            .toISOString()
            .slice(0, 10),
        materialCost:
          costs.materialCost,
        finishedGoodsCost:
          costs.finishedGoodsCost,
        wipVariance:
          totalVariance,
        totalVariance,
        status:
          ProductionVarianceStatus.CALCULATED,
        notes:
          dto.notes ?? null,
        createdBy:
          userId,
        lines,
      });

    try {
      return await this.varianceRepository.save(
        variance,
      );
    } catch (error: unknown) {
      if (
        this.isUniqueViolation(error)
      ) {
        throw new ConflictException(
          'Production variance has already been calculated for this production order.',
        );
      }

      throw error;
    }
  }

  async post(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<ProductionVarianceEntity> {
    const variance =
      await this.varianceRepository.findOne({
        where: {
          id,
          companyId,
        },
        relations: {
          productionOrder: true,
          lines: true,
        },
      });

    if (!variance) {
      throw new NotFoundException(
        'Production variance not found.',
      );
    }

    /*
     * Existing POSTED rows may have been posted through the legacy
     * JournalEntriesService path. Returning them avoids creating a second
     * journal during migration to AccountingEngineService.
     */
    if (
      variance.status ===
      ProductionVarianceStatus.POSTED
    ) {
      return variance;
    }

    const currentCosts =
      await this.getWipCosts(
        companyId,
        variance.productionOrderId,
      );

    const currentVariance =
      this.money(
        currentCosts.materialCost -
          currentCosts.finishedGoodsCost,
      );

    if (
      Math.abs(
        currentVariance -
          Number(
            variance.wipVariance,
          ),
      ) > 0.01
    ) {
      throw new ConflictException(
        'WIP postings changed after variance calculation. Recalculate the production variance.',
      );
    }

    /*
     * Keep the canonical field synchronized with the already-existing
     * wipVariance field so the Accounting Engine posting rule reads the exact
     * amount verified immediately before posting.
     */
    variance.totalVariance =
      currentVariance;

    if (
      Math.abs(
        currentVariance,
      ) <= 0.01
    ) {
      variance.status =
        ProductionVarianceStatus.POSTED;

      return this.varianceRepository.save(
        variance,
      );
    }

    /*
     * The Accounting Engine owns journal creation/idempotency.
     * It posts sourceType=production_variance and prevents duplicate source
     * journals. Do not call JournalEntriesService directly here.
     */
    await this.autoPostProductionVarianceIfEnabled(
      variance.id,
      companyId,
      userId,
    );

    variance.status =
      ProductionVarianceStatus.POSTED;

    return this.varianceRepository.save(
      variance,
    );
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<ProductionVarianceEntity> {
    const variance =
      await this.varianceRepository.findOne({
        where: {
          id,
          companyId,
        },
        relations: {
          productionOrder: true,
          journalEntry: true,
          lines: {
            item: true,
            productionOrderComponent:
              true,
          },
        },
      });

    if (!variance) {
      throw new NotFoundException(
        'Production variance not found.',
      );
    }

    return variance;
  }

  async list(
    companyId: string,
    filter: ProductionVarianceFilterDto,
  ) {
    const [
      data,
      total,
    ] =
      await this.varianceRepository.findAndCount({
        where: {
          companyId,
          ...(filter.productionOrderId
            ? {
                productionOrderId:
                  filter.productionOrderId,
              }
            : {}),
          ...(filter.status
            ? {
                status:
                  filter.status,
              }
            : {}),
        },
        relations: {
          productionOrder: true,
          journalEntry: true,
        },
        order: {
          varianceDate: 'DESC',
          createdAt: 'DESC',
        },
        skip:
          (filter.page - 1) *
          filter.limit,
        take:
          filter.limit,
      });

    return {
      data,
      total,
      page:
        filter.page,
      limit:
        filter.limit,
    };
  }

  private async autoPostProductionVarianceIfEnabled(
    sourceId: string,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const settings =
      await this.accountingSettingsRepository.findOne({
        where: {
          companyId,
        },
      });

    if (
      settings?.autoPostProductionVariance ===
      false
    ) {
      return;
    }

    await this.accountingEngineService
      .postProductionVariance(
        sourceId,
        companyId,
        userId,
      );
  }

  private async getWipCosts(
    companyId: string,
    productionOrderId: string,
  ): Promise<{
    materialCost: number;
    finishedGoodsCost: number;
  }> {
    const raw =
      await this.wipPostingRepository
        .createQueryBuilder(
          'posting',
        )
        .select(
          'COALESCE(SUM(CASE WHEN posting.posting_type = :material THEN posting.amount ELSE 0 END), 0)',
          'materialCost',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN posting.posting_type = :finished THEN posting.amount ELSE 0 END), 0)',
          'finishedGoodsCost',
        )
        .where(
          'posting.company_id = :companyId',
          {
            companyId,
          },
        )
        .andWhere(
          'posting.production_order_id = :productionOrderId',
          {
            productionOrderId,
          },
        )
        .setParameters({
          material:
            WipPostingType.MATERIAL_CONSUMPTION,
          finished:
            WipPostingType.FINISHED_GOODS_RECEIPT,
        })
        .getRawOne<{
          materialCost: string;
          finishedGoodsCost: string;
        }>();

    return {
      materialCost:
        this.money(
          Number(
            raw?.materialCost ?? 0,
          ),
        ),
      finishedGoodsCost:
        this.money(
          Number(
            raw?.finishedGoodsCost ??
              0,
          ),
        ),
    };
  }

  private async getComponentActualCosts(
    productionOrderId: string,
  ): Promise<
    Map<string, number>
  > {
    const rows =
      await this.consumptionLineRepository
        .createQueryBuilder(
          'line',
        )
        .innerJoin(
          'line.consumption',
          'consumption',
        )
        .select(
          'line.production_order_component_id',
          'componentId',
        )
        .addSelect(
          'COALESCE(SUM(line.total_cost), 0)',
          'actualCost',
        )
        .where(
          'consumption.production_order_id = :productionOrderId',
          {
            productionOrderId,
          },
        )
        .andWhere(
          'consumption.reversed_at IS NULL',
        )
        .groupBy(
          'line.production_order_component_id',
        )
        .getRawMany<{
          componentId: string;
          actualCost: string;
        }>();

    return new Map(
      rows.map(
        (row) => [
          row.componentId,
          Number(
            row.actualCost,
          ),
        ],
      ),
    );
  }

  private async validateAccount(
    companyId: string,
    accountId: string,
    type: AccountType,
    label: string,
  ): Promise<void> {
    const account =
      await this.accountRepository.findOne({
        where: {
          id: accountId,
          companyId,
        },
      });

    if (!account) {
      throw new NotFoundException(
        `${label} account not found.`,
      );
    }

    if (
      account.type !== type ||
      account.isGroup ||
      account.status !==
        AccountStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `${label} account must be an active posting ${type.toUpperCase()} account.`,
      );
    }
  }

  private money(
    value: number,
  ): number {
    return (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
          100,
      ) / 100
    );
  }

  private quantity(
    value: number,
  ): number {
    return (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
          1_000_000,
      ) /
      1_000_000
    );
  }

  private isUniqueViolation(
    error: unknown,
  ): boolean {
    return (
      typeof error ===
        'object' &&
      error !== null &&
      'code' in error &&
      (
        error as {
          code?: string;
        }
      ).code === '23505'
    );
  }
}