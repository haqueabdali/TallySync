import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { CostingAnalysisQueryDto } from './dto/costing-analysis-query.dto';
import {
  CostingVarianceSummaryResponseDto,
  MaterialVarianceLineResponseDto,
  PaginatedCostingVarianceResponseDto,
} from './dto/costing-variance-response.dto';
import { CreateProductionCostAnalysisDto } from './dto/create-production-cost-analysis.dto';
import { ProfitabilityReportQueryDto } from './dto/profitability-report-query.dto';
import { ProfitabilityReportResponseDto } from './dto/profitability-report-response.dto';
import { UpdateProductionCostAnalysisDto } from './dto/update-production-cost-analysis.dto';
import { ProductionCostAnalysisEntity } from './entities/production-cost-analysis.entity';
import { ProductionCostMaterialLineEntity } from './entities/production-cost-material-line.entity';
import { CostingAnalysisStatus } from './enums/costing-analysis-status.enum';

@Injectable()
export class CostingVarianceService {
  constructor(
    @InjectRepository(
      ProductionCostAnalysisEntity,
    )
    private readonly analysisRepository:
      Repository<ProductionCostAnalysisEntity>,

    @InjectRepository(
      ProductionCostMaterialLineEntity,
    )
    private readonly materialLineRepository:
      Repository<ProductionCostMaterialLineEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateProductionCostAnalysisDto,
  ): Promise<CostingVarianceSummaryResponseDto> {
    await this.ensureReferenceAvailable(
      companyId,
      dto.productionReferenceId,
    );

    this.validateMaterialLines(
      dto.materialLines,
    );

    return this.dataSource.transaction(
      async (manager) => {
        const analysisRepository =
          manager.getRepository(
            ProductionCostAnalysisEntity,
          );

        const lineRepository =
          manager.getRepository(
            ProductionCostMaterialLineEntity,
          );

        const analysis =
          analysisRepository.create({
            companyId,
            productionReferenceId:
              dto.productionReferenceId,
            analysisNumber:
              await this.generateNumber(
                companyId,
                dto.analysisDate,
                analysisRepository,
              ),
            analysisDate:
              dto.analysisDate.slice(0, 10),
            finishedItemId:
              dto.finishedItemId ?? null,
            plannedOutputQuantity:
              dto.plannedOutputQuantity,
            actualOutputQuantity:
              dto.actualOutputQuantity,
            standardConversionCost:
              dto.standardConversionCost ??
              0,
            actualConversionCost:
              dto.actualConversionCost ??
              0,
            standardOverheadCost:
              dto.standardOverheadCost ??
              0,
            actualOverheadCost:
              dto.actualOverheadCost ??
              0,
            revenueAmount:
              dto.revenueAmount ?? 0,
            status:
              CostingAnalysisStatus.DRAFT,
            finalizedAt: null,
            notes:
              this.optional(dto.notes),
            createdBy: userId,
            updatedBy: userId,
            materialLines: [],
          });

        const savedAnalysis =
          await analysisRepository.save(
            analysis,
          );

        savedAnalysis.materialLines =
          await lineRepository.save(
            dto.materialLines.map(
              (line) =>
                lineRepository.create({
                  analysisId:
                    savedAnalysis.id,
                  itemId: line.itemId,
                  standardQuantity:
                    line.standardQuantity,
                  actualQuantity:
                    line.actualQuantity,
                  standardUnitCost:
                    line.standardUnitCost,
                  actualUnitCost:
                    line.actualUnitCost,
                  description:
                    this.optional(
                      line.description,
                    ),
                }),
            ),
          );

        return this.calculate(
          savedAnalysis,
        );
      },
    );
  }

  async findAll(
    companyId: string,
    query: CostingAnalysisQueryDto,
  ): Promise<PaginatedCostingVarianceResponseDto> {
    this.validateDateRange(
      query.dateFrom,
      query.dateTo,
    );

    const qb = this.analysisRepository
      .createQueryBuilder('analysis')
      .leftJoinAndSelect(
        'analysis.materialLines',
        'materialLine',
      )
      .where(
        'analysis.company_id = :companyId',
        { companyId },
      )
      .andWhere(
        'analysis.deleted_at IS NULL',
      );

    if (query.status) {
      qb.andWhere(
        'analysis.status = :status',
        { status: query.status },
      );
    }

    if (query.productionReferenceId) {
      qb.andWhere(
        'analysis.production_reference_id = :productionReferenceId',
        {
          productionReferenceId:
            query.productionReferenceId,
        },
      );
    }

    if (query.finishedItemId) {
      qb.andWhere(
        'analysis.finished_item_id = :finishedItemId',
        {
          finishedItemId:
            query.finishedItemId,
        },
      );
    }

    if (query.dateFrom) {
      qb.andWhere(
        'analysis.analysis_date >= :dateFrom',
        {
          dateFrom:
            query.dateFrom.slice(0, 10),
        },
      );
    }

    if (query.dateTo) {
      qb.andWhere(
        'analysis.analysis_date <= :dateTo',
        {
          dateTo:
            query.dateTo.slice(0, 10),
        },
      );
    }

    const [rows, total] =
      await qb
        .orderBy(
          'analysis.analysis_date',
          'DESC',
        )
        .addOrderBy(
          'analysis.created_at',
          'DESC',
        )
        .skip(
          (query.page - 1) *
            query.limit,
        )
        .take(query.limit)
        .getManyAndCount();

    return {
      data: rows.map((row) =>
        this.calculate(row),
      ),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total / query.limit,
              ),
      },
    };
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<CostingVarianceSummaryResponseDto> {
    return this.calculate(
      await this.getEntity(
        companyId,
        id,
      ),
    );
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateProductionCostAnalysisDto,
  ): Promise<CostingVarianceSummaryResponseDto> {
    const analysis =
      await this.getEntity(
        companyId,
        id,
      );

    if (
      analysis.status !==
      CostingAnalysisStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft costing analyses can be edited.',
      );
    }

    if (
      dto.productionReferenceId &&
      dto.productionReferenceId !==
        analysis.productionReferenceId
    ) {
      await this.ensureReferenceAvailable(
        companyId,
        dto.productionReferenceId,
        analysis.id,
      );
      analysis.productionReferenceId =
        dto.productionReferenceId;
    }

    if (dto.analysisDate) {
      analysis.analysisDate =
        dto.analysisDate.slice(0, 10);
    }

    if (
      dto.finishedItemId !==
      undefined
    ) {
      analysis.finishedItemId =
        dto.finishedItemId ?? null;
    }

    if (
      dto.plannedOutputQuantity !==
      undefined
    ) {
      analysis.plannedOutputQuantity =
        dto.plannedOutputQuantity;
    }

    if (
      dto.actualOutputQuantity !==
      undefined
    ) {
      analysis.actualOutputQuantity =
        dto.actualOutputQuantity;
    }

    if (
      dto.standardConversionCost !==
      undefined
    ) {
      analysis.standardConversionCost =
        dto.standardConversionCost;
    }

    if (
      dto.actualConversionCost !==
      undefined
    ) {
      analysis.actualConversionCost =
        dto.actualConversionCost;
    }

    if (
      dto.standardOverheadCost !==
      undefined
    ) {
      analysis.standardOverheadCost =
        dto.standardOverheadCost;
    }

    if (
      dto.actualOverheadCost !==
      undefined
    ) {
      analysis.actualOverheadCost =
        dto.actualOverheadCost;
    }

    if (
      dto.revenueAmount !== undefined
    ) {
      analysis.revenueAmount =
        dto.revenueAmount;
    }

    if (dto.notes !== undefined) {
      analysis.notes =
        this.optional(dto.notes);
    }

    analysis.updatedBy = userId;

    if (dto.materialLines) {
      this.validateMaterialLines(
        dto.materialLines,
      );

      await this.materialLineRepository.delete(
        {
          analysisId: analysis.id,
        },
      );

      analysis.materialLines =
        await this.materialLineRepository.save(
          dto.materialLines.map(
            (line) =>
              this.materialLineRepository.create({
                analysisId:
                  analysis.id,
                itemId: line.itemId,
                standardQuantity:
                  line.standardQuantity,
                actualQuantity:
                  line.actualQuantity,
                standardUnitCost:
                  line.standardUnitCost,
                actualUnitCost:
                  line.actualUnitCost,
                description:
                  this.optional(
                    line.description,
                  ),
              }),
          ),
        );
    }

    const saved =
      await this.analysisRepository.save(
        analysis,
      );

    return this.calculate(saved);
  }

  async finalize(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<CostingVarianceSummaryResponseDto> {
    const analysis =
      await this.getEntity(
        companyId,
        id,
      );

    if (
      analysis.status !==
      CostingAnalysisStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft costing analyses can be finalized.',
      );
    }

    if (
      analysis.actualOutputQuantity <= 0
    ) {
      throw new ConflictException(
        'Actual output quantity must be greater than zero before finalization.',
      );
    }

    if (
      !analysis.materialLines.length
    ) {
      throw new ConflictException(
        'At least one material cost line is required.',
      );
    }

    analysis.status =
      CostingAnalysisStatus.FINALIZED;
    analysis.finalizedAt =
      new Date();
    analysis.updatedBy = userId;

    return this.calculate(
      await this.analysisRepository.save(
        analysis,
      ),
    );
  }

  async cancel(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<CostingVarianceSummaryResponseDto> {
    const analysis =
      await this.getEntity(
        companyId,
        id,
      );

    if (
      analysis.status ===
      CostingAnalysisStatus.FINALIZED
    ) {
      throw new ConflictException(
        'Finalized costing analyses cannot be cancelled.',
      );
    }

    if (
      analysis.status ===
      CostingAnalysisStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Costing analysis is already cancelled.',
      );
    }

    analysis.status =
      CostingAnalysisStatus.CANCELLED;
    analysis.updatedBy = userId;

    return this.calculate(
      await this.analysisRepository.save(
        analysis,
      ),
    );
  }

  async getProfitabilityReport(
    companyId: string,
    query: ProfitabilityReportQueryDto,
  ): Promise<ProfitabilityReportResponseDto> {
    this.validateDateRange(
      query.dateFrom,
      query.dateTo,
    );

    const dateFrom =
      query.dateFrom.slice(0, 10);
    const dateTo =
      query.dateTo.slice(0, 10);

    const rows =
      await this.analysisRepository
        .find({
          where: {
            companyId,
            status:
              CostingAnalysisStatus.FINALIZED,
          },
          relations: {
            materialLines: true,
          },
        });

    const filtered =
      rows.filter(
        (row) =>
          row.analysisDate >= dateFrom &&
          row.analysisDate <= dateTo,
      );

    const summaries =
      filtered.map((row) =>
        this.calculate(row),
      );

    const totalRevenue =
      summaries.reduce(
        (sum, row) =>
          sum + row.revenueAmount,
        0,
      );

    const totalStandardCost =
      summaries.reduce(
        (sum, row) =>
          sum + row.totalStandardCost,
        0,
      );

    const totalActualCost =
      summaries.reduce(
        (sum, row) =>
          sum + row.totalActualCost,
        0,
      );

    const grossProfit =
      totalRevenue -
      totalActualCost;

    return {
      dateFrom,
      dateTo,
      finalizedAnalyses:
        summaries.length,
      totalRevenue:
        this.money(totalRevenue),
      totalStandardCost:
        this.money(
          totalStandardCost,
        ),
      totalActualCost:
        this.money(
          totalActualCost,
        ),
      totalCostVariance:
        this.money(
          totalActualCost -
            totalStandardCost,
        ),
      grossProfit:
        this.money(grossProfit),
      grossMarginPercent:
        this.percent(
          grossProfit,
          totalRevenue,
        ),
    };
  }

  private calculate(
    analysis: ProductionCostAnalysisEntity,
  ): CostingVarianceSummaryResponseDto {
    const materials =
      (analysis.materialLines ?? []).map(
        (line) =>
          this.calculateMaterialLine(
            line,
          ),
      );

    const standardMaterialCost =
      materials.reduce(
        (sum, line) =>
          sum +
          line.standardMaterialCost,
        0,
      );

    const actualMaterialCost =
      materials.reduce(
        (sum, line) =>
          sum +
          line.actualMaterialCost,
        0,
      );

    const materialQuantityVariance =
      materials.reduce(
        (sum, line) =>
          sum +
          line.quantityVariance,
        0,
      );

    const materialPriceVariance =
      materials.reduce(
        (sum, line) =>
          sum +
          line.priceVariance,
        0,
      );

    const totalMaterialVariance =
      actualMaterialCost -
      standardMaterialCost;

    const conversionCostVariance =
      Number(
        analysis.actualConversionCost,
      ) -
      Number(
        analysis.standardConversionCost,
      );

    const overheadVariance =
      Number(
        analysis.actualOverheadCost,
      ) -
      Number(
        analysis.standardOverheadCost,
      );

    const totalStandardCost =
      standardMaterialCost +
      Number(
        analysis.standardConversionCost,
      ) +
      Number(
        analysis.standardOverheadCost,
      );

    const totalActualCost =
      actualMaterialCost +
      Number(
        analysis.actualConversionCost,
      ) +
      Number(
        analysis.actualOverheadCost,
      );

    const totalCostVariance =
      totalActualCost -
      totalStandardCost;

    const revenueAmount =
      Number(
        analysis.revenueAmount,
      );

    const grossProfit =
      revenueAmount -
      totalActualCost;

    return {
      analysisId: analysis.id,
      productionReferenceId:
        analysis.productionReferenceId,
      analysisNumber:
        analysis.analysisNumber,
      analysisDate:
        analysis.analysisDate,
      status: analysis.status,

      plannedOutputQuantity:
        Number(
          analysis.plannedOutputQuantity,
        ),
      actualOutputQuantity:
        Number(
          analysis.actualOutputQuantity,
        ),
      outputQuantityVariance:
        this.quantity(
          Number(
            analysis.actualOutputQuantity,
          ) -
            Number(
              analysis.plannedOutputQuantity,
            ),
        ),

      standardMaterialCost:
        this.money(
          standardMaterialCost,
        ),
      actualMaterialCost:
        this.money(actualMaterialCost),
      materialQuantityVariance:
        this.money(
          materialQuantityVariance,
        ),
      materialPriceVariance:
        this.money(
          materialPriceVariance,
        ),
      totalMaterialVariance:
        this.money(
          totalMaterialVariance,
        ),

      standardConversionCost:
        this.money(
          Number(
            analysis.standardConversionCost,
          ),
        ),
      actualConversionCost:
        this.money(
          Number(
            analysis.actualConversionCost,
          ),
        ),
      conversionCostVariance:
        this.money(
          conversionCostVariance,
        ),

      standardOverheadCost:
        this.money(
          Number(
            analysis.standardOverheadCost,
          ),
        ),
      actualOverheadCost:
        this.money(
          Number(
            analysis.actualOverheadCost,
          ),
        ),
      overheadVariance:
        this.money(
          overheadVariance,
        ),

      totalStandardCost:
        this.money(
          totalStandardCost,
        ),
      totalActualCost:
        this.money(totalActualCost),
      totalCostVariance:
        this.money(totalCostVariance),

      standardUnitCost:
        this.unitCost(
          totalStandardCost,
          Number(
            analysis.plannedOutputQuantity,
          ),
        ),
      actualUnitCost:
        this.unitCost(
          totalActualCost,
          Number(
            analysis.actualOutputQuantity,
          ),
        ),

      revenueAmount:
        this.money(revenueAmount),
      grossProfit:
        this.money(grossProfit),
      grossMarginPercent:
        this.percent(
          grossProfit,
          revenueAmount,
        ),

      materials,
    };
  }

  private calculateMaterialLine(
    line: ProductionCostMaterialLineEntity,
  ): MaterialVarianceLineResponseDto {
    const standardQuantity =
      Number(line.standardQuantity);

    const actualQuantity =
      Number(line.actualQuantity);

    const standardUnitCost =
      Number(line.standardUnitCost);

    const actualUnitCost =
      Number(line.actualUnitCost);

    const standardMaterialCost =
      standardQuantity *
      standardUnitCost;

    const actualMaterialCost =
      actualQuantity *
      actualUnitCost;

    const quantityVariance =
      (actualQuantity -
        standardQuantity) *
      standardUnitCost;

    const priceVariance =
      (actualUnitCost -
        standardUnitCost) *
      actualQuantity;

    return {
      itemId: line.itemId,
      standardQuantity,
      actualQuantity,
      standardUnitCost,
      actualUnitCost,
      standardMaterialCost:
        this.money(
          standardMaterialCost,
        ),
      actualMaterialCost:
        this.money(
          actualMaterialCost,
        ),
      quantityVariance:
        this.money(
          quantityVariance,
        ),
      priceVariance:
        this.money(priceVariance),
      totalMaterialVariance:
        this.money(
          actualMaterialCost -
            standardMaterialCost,
        ),
    };
  }

  private validateMaterialLines(
    lines: CreateProductionCostAnalysisDto['materialLines'],
  ): void {
    const ids =
      lines.map((line) =>
        line.itemId,
      );

    if (
      new Set(ids).size !==
      ids.length
    ) {
      throw new BadRequestException(
        'Duplicate material items are not allowed.',
      );
    }
  }

  private async ensureReferenceAvailable(
    companyId: string,
    productionReferenceId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing =
      await this.analysisRepository.findOne({
        where: {
          companyId,
          productionReferenceId,
        },
        withDeleted: true,
      });

    if (
      existing &&
      existing.deletedAt === null &&
      existing.id !== excludeId
    ) {
      throw new ConflictException(
        'A costing analysis already exists for this production reference.',
      );
    }
  }

  private async getEntity(
    companyId: string,
    id: string,
  ): Promise<ProductionCostAnalysisEntity> {
    const entity =
      await this.analysisRepository.findOne({
        where: {
          id,
          companyId,
        },
        relations: {
          materialLines: true,
        },
      });

    if (!entity) {
      throw new NotFoundException(
        'Production costing analysis not found.',
      );
    }

    return entity;
  }

  private async generateNumber(
    companyId: string,
    analysisDate: string,
    repository:
      Repository<ProductionCostAnalysisEntity>,
  ): Promise<string> {
    const year =
      new Date(
        `${analysisDate.slice(
          0,
          10,
        )}T00:00:00.000Z`,
      ).getUTCFullYear();

    const prefix =
      `PCA-${year}-`;

    const latest =
      await repository
        .createQueryBuilder(
          'analysis',
        )
        .withDeleted()
        .select(
          'analysis.analysis_number',
          'analysisNumber',
        )
        .where(
          'analysis.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'analysis.analysis_number LIKE :prefix',
          {
            prefix: `${prefix}%`,
          },
        )
        .orderBy(
          'analysis.analysis_number',
          'DESC',
        )
        .getRawOne<{
          analysisNumber?: string;
        }>();

    const current =
      latest?.analysisNumber
        ? Number(
            latest.analysisNumber.replace(
              prefix,
              '',
            ),
          )
        : 0;

    return `${prefix}${String(
      current + 1,
    ).padStart(6, '0')}`;
  }

  private validateDateRange(
    dateFrom?: string,
    dateTo?: string,
  ): void {
    if (
      dateFrom &&
      dateTo &&
      new Date(dateFrom).getTime() >
        new Date(dateTo).getTime()
    ) {
      throw new BadRequestException(
        'dateFrom must be earlier than or equal to dateTo.',
      );
    }
  }

  private money(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100;
  }

  private quantity(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        10_000,
    ) / 10_000;
  }

  private unitCost(
    totalCost: number,
    quantity: number,
  ): number {
    if (quantity <= 0) {
      return 0;
    }

    return Math.round(
      ((totalCost / quantity) +
        Number.EPSILON) *
        1_000_000,
    ) / 1_000_000;
  }

  private percent(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator === 0) {
      return 0;
    }

    return Math.round(
      ((numerator / denominator) *
        100 +
        Number.EPSILON) *
        100,
    ) / 100;
  }

  private optional(
    value?: string | null,
  ): string | null {
    const normalized =
      value?.trim();

    return normalized
      ? normalized
      : null;
  }
}
