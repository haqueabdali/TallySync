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

import { CompleteQualityInspectionDto } from './dto/complete-quality-inspection.dto';
import { CreateQualityInspectionDto } from './dto/create-quality-inspection.dto';
import { QualityInspectionQueryDto } from './dto/quality-inspection-query.dto';
import {
  PaginatedQualityInspectionsResponseDto,
  QualityInspectionCheckResponseDto,
  QualityInspectionResponseDto,
} from './dto/quality-inspection-response.dto';
import { QualityReportQueryDto } from './dto/quality-report-query.dto';
import { QualityReportResponseDto } from './dto/quality-report-response.dto';
import { RecordQualityCheckResultDto } from './dto/record-quality-check-result.dto';
import { UpdateQualityInspectionDto } from './dto/update-quality-inspection.dto';
import { QualityInspectionCheckEntity } from './entities/quality-inspection-check.entity';
import { QualityInspectionEntity } from './entities/quality-inspection.entity';
import { QualityCheckResult } from './enums/quality-check-result.enum';
import { QualityInspectionSourceType } from './enums/quality-inspection-source-type.enum';
import { QualityInspectionStatus } from './enums/quality-inspection-status.enum';

interface RawQualityTotals {
  inspected: string | null;
  accepted: string | null;
  rejected: string | null;
}

@Injectable()
export class QualityManagementService {
  constructor(
    @InjectRepository(QualityInspectionEntity)
    private readonly inspectionRepository:
      Repository<QualityInspectionEntity>,
    @InjectRepository(QualityInspectionCheckEntity)
    private readonly checkRepository:
      Repository<QualityInspectionCheckEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    this.validateSource(dto.sourceType, dto.sourceId);
    this.ensureUniqueCheckNames(
      dto.checks.map((check) => check.checkName),
    );

    return this.dataSource.transaction(
      async (manager) => {
        const inspectionRepository =
          manager.getRepository(
            QualityInspectionEntity,
          );
        const checkRepository =
          manager.getRepository(
            QualityInspectionCheckEntity,
          );

        const inspection =
          inspectionRepository.create({
            companyId,
            inspectionNumber:
              await this.generateNumber(
                companyId,
                dto.inspectionDate,
                inspectionRepository,
              ),
            inspectionDate:
              dto.inspectionDate.slice(0, 10),
            sourceType: dto.sourceType,
            sourceId: dto.sourceId ?? null,
            itemId: dto.itemId ?? null,
            warehouseId: dto.warehouseId ?? null,
            status:
              QualityInspectionStatus.DRAFT,
            inspectedQuantity:
              dto.inspectedQuantity,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
            inspectorId:
              dto.inspectorId ?? userId,
            completedAt: null,
            failureReason: null,
            notes: this.optional(dto.notes),
            createdBy: userId,
            updatedBy: userId,
            checks: [],
          });

        const savedInspection =
          await inspectionRepository.save(
            inspection,
          );

        const checks = dto.checks.map(
          (check) =>
            checkRepository.create({
              inspectionId:
                savedInspection.id,
              checkName:
                check.checkName.trim(),
              specification:
                this.optional(
                  check.specification,
                ),
              minimumValue:
                check.minimumValue ?? null,
              maximumValue:
                check.maximumValue ?? null,
              actualNumericValue: null,
              expectedText:
                this.optional(
                  check.expectedText,
                ),
              actualText: null,
              result:
                QualityCheckResult.PENDING,
              isMandatory:
                check.isMandatory ?? true,
              remarks:
                this.optional(check.remarks),
            }),
        );

        this.validateCheckDefinitions(checks);

        savedInspection.checks =
          await checkRepository.save(checks);

        return this.toResponse(
          savedInspection,
        );
      },
    );
  }

  async findAll(
    companyId: string,
    query: QualityInspectionQueryDto,
  ): Promise<PaginatedQualityInspectionsResponseDto> {
    this.validateDateRange(
      query.dateFrom,
      query.dateTo,
    );

    const qb = this.inspectionRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect(
        'inspection.checks',
        'check',
      )
      .where(
        'inspection.company_id = :companyId',
        { companyId },
      )
      .andWhere(
        'inspection.deleted_at IS NULL',
      );

    if (query.status) {
      qb.andWhere(
        'inspection.status = :status',
        { status: query.status },
      );
    }

    if (query.sourceType) {
      qb.andWhere(
        'inspection.source_type = :sourceType',
        { sourceType: query.sourceType },
      );
    }

    if (query.sourceId) {
      qb.andWhere(
        'inspection.source_id = :sourceId',
        { sourceId: query.sourceId },
      );
    }

    if (query.itemId) {
      qb.andWhere(
        'inspection.item_id = :itemId',
        { itemId: query.itemId },
      );
    }

    if (query.warehouseId) {
      qb.andWhere(
        'inspection.warehouse_id = :warehouseId',
        {
          warehouseId:
            query.warehouseId,
        },
      );
    }

    if (query.dateFrom) {
      qb.andWhere(
        'inspection.inspection_date >= :dateFrom',
        {
          dateFrom:
            query.dateFrom.slice(0, 10),
        },
      );
    }

    if (query.dateTo) {
      qb.andWhere(
        'inspection.inspection_date <= :dateTo',
        {
          dateTo:
            query.dateTo.slice(0, 10),
        },
      );
    }

    const [data, total] =
      await qb
        .orderBy(
          'inspection.inspection_date',
          'DESC',
        )
        .addOrderBy(
          'inspection.created_at',
          'DESC',
        )
        .skip(
          (query.page - 1) *
            query.limit,
        )
        .take(query.limit)
        .getManyAndCount();

    return {
      data: data.map((row) =>
        this.toResponse(row),
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
  ): Promise<QualityInspectionResponseDto> {
    return this.toResponse(
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
    dto: UpdateQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    const inspection =
      await this.getEntity(
        companyId,
        id,
      );

    this.ensureEditable(inspection);

    if (
      dto.sourceType !== undefined ||
      dto.sourceId !== undefined
    ) {
      const sourceType =
        dto.sourceType ??
        inspection.sourceType;
      const sourceId =
        dto.sourceId ??
        inspection.sourceId ??
        undefined;

      this.validateSource(
        sourceType,
        sourceId,
      );

      inspection.sourceType =
        sourceType;
      inspection.sourceId =
        sourceId ?? null;
    }

    if (dto.inspectionDate) {
      inspection.inspectionDate =
        dto.inspectionDate.slice(0, 10);
    }
    if (dto.itemId !== undefined) {
      inspection.itemId =
        dto.itemId ?? null;
    }
    if (
      dto.warehouseId !== undefined
    ) {
      inspection.warehouseId =
        dto.warehouseId ?? null;
    }
    if (
      dto.inspectedQuantity !==
      undefined
    ) {
      inspection.inspectedQuantity =
        dto.inspectedQuantity;
    }
    if (
      dto.inspectorId !== undefined
    ) {
      inspection.inspectorId =
        dto.inspectorId ?? null;
    }
    if (dto.notes !== undefined) {
      inspection.notes =
        this.optional(dto.notes);
    }

    inspection.updatedBy = userId;

    return this.toResponse(
      await this.inspectionRepository.save(
        inspection,
      ),
    );
  }

  async start(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<QualityInspectionResponseDto> {
    const inspection =
      await this.getEntity(
        companyId,
        id,
      );

    if (
      inspection.status !==
      QualityInspectionStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft inspections can be started.',
      );
    }

    if (!inspection.checks.length) {
      throw new ConflictException(
        'Quality inspection must contain at least one check.',
      );
    }

    inspection.status =
      QualityInspectionStatus.IN_PROGRESS;
    inspection.updatedBy = userId;

    return this.toResponse(
      await this.inspectionRepository.save(
        inspection,
      ),
    );
  }

  async recordCheckResult(
    companyId: string,
    userId: string,
    inspectionId: string,
    checkId: string,
    dto: RecordQualityCheckResultDto,
  ): Promise<QualityInspectionCheckResponseDto> {
    const inspection =
      await this.getEntity(
        companyId,
        inspectionId,
      );

    if (
      inspection.status !==
      QualityInspectionStatus.IN_PROGRESS
    ) {
      throw new ConflictException(
        'Check results can only be recorded for an in-progress inspection.',
      );
    }

    const check =
      inspection.checks.find(
        (row) => row.id === checkId,
      );

    if (!check) {
      throw new NotFoundException(
        'Quality check not found.',
      );
    }

    if (
      dto.actualNumericValue ===
        undefined &&
      dto.actualText === undefined
    ) {
      throw new BadRequestException(
        'A numeric or text result is required.',
      );
    }

    if (
      dto.actualNumericValue !==
      undefined
    ) {
      check.actualNumericValue =
        dto.actualNumericValue;
    }

    if (dto.actualText !== undefined) {
      check.actualText =
        this.optional(dto.actualText);
    }

    if (dto.remarks !== undefined) {
      check.remarks =
        this.optional(dto.remarks);
    }

    check.result =
      this.evaluateCheck(check);

    await this.checkRepository.save(
      check,
    );

    inspection.updatedBy = userId;
    await this.inspectionRepository.save(
      inspection,
    );

    return this.toCheckResponse(check);
  }

  async complete(
    companyId: string,
    userId: string,
    id: string,
    dto: CompleteQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    const inspection =
      await this.getEntity(
        companyId,
        id,
      );

    if (
      inspection.status !==
      QualityInspectionStatus.IN_PROGRESS
    ) {
      throw new ConflictException(
        'Only in-progress inspections can be completed.',
      );
    }

    const pendingMandatory =
      inspection.checks.some(
        (check) =>
          check.isMandatory &&
          check.result ===
            QualityCheckResult.PENDING,
      );

    if (pendingMandatory) {
      throw new ConflictException(
        'All mandatory quality checks must be completed.',
      );
    }

    const accepted =
      Number(dto.acceptedQuantity);
    const rejected =
      Number(dto.rejectedQuantity);
    const inspected =
      Number(
        inspection.inspectedQuantity,
      );

    if (
      Math.abs(
        accepted +
          rejected -
          inspected,
      ) > 0.0001
    ) {
      throw new BadRequestException(
        'Accepted plus rejected quantity must equal inspected quantity.',
      );
    }

    const mandatoryFailed =
      inspection.checks.some(
        (check) =>
          check.isMandatory &&
          check.result ===
            QualityCheckResult.FAIL,
      );

    const failed =
      mandatoryFailed ||
      rejected > 0;

    if (
      failed &&
      !dto.failureReason?.trim()
    ) {
      throw new BadRequestException(
        'A failure reason is required for failed inspections.',
      );
    }

    inspection.acceptedQuantity =
      accepted;
    inspection.rejectedQuantity =
      rejected;
    inspection.status = failed
      ? QualityInspectionStatus.FAILED
      : QualityInspectionStatus.PASSED;
    inspection.failureReason = failed
      ? dto.failureReason?.trim() ??
        null
      : null;
    inspection.completedAt =
      new Date();
    inspection.updatedBy = userId;

    return this.toResponse(
      await this.inspectionRepository.save(
        inspection,
      ),
    );
  }

  async cancel(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<QualityInspectionResponseDto> {
    const inspection =
      await this.getEntity(
        companyId,
        id,
      );

    if (
      inspection.status ===
        QualityInspectionStatus.PASSED ||
      inspection.status ===
        QualityInspectionStatus.FAILED ||
      inspection.status ===
        QualityInspectionStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Completed or cancelled inspections cannot be cancelled.',
      );
    }

    inspection.status =
      QualityInspectionStatus.CANCELLED;
    inspection.updatedBy = userId;

    return this.toResponse(
      await this.inspectionRepository.save(
        inspection,
      ),
    );
  }

  async getReport(
    companyId: string,
    query: QualityReportQueryDto,
  ): Promise<QualityReportResponseDto> {
    this.validateDateRange(
      query.dateFrom,
      query.dateTo,
    );

    const dateFrom =
      query.dateFrom.slice(0, 10);
    const dateTo =
      query.dateTo.slice(0, 10);

    const countByStatus = async (
      status: QualityInspectionStatus,
    ): Promise<number> =>
      this.inspectionRepository
        .createQueryBuilder(
          'inspection',
        )
        .where(
          'inspection.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'inspection.deleted_at IS NULL',
        )
        .andWhere(
          'inspection.inspection_date BETWEEN :dateFrom AND :dateTo',
          { dateFrom, dateTo },
        )
        .andWhere(
          'inspection.status = :status',
          { status },
        )
        .getCount();

    const [
      totalInspections,
      passedInspections,
      failedInspections,
      cancelledInspections,
    ] = await Promise.all([
      this.inspectionRepository
        .createQueryBuilder(
          'inspection',
        )
        .where(
          'inspection.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'inspection.deleted_at IS NULL',
        )
        .andWhere(
          'inspection.inspection_date BETWEEN :dateFrom AND :dateTo',
          { dateFrom, dateTo },
        )
        .getCount(),
      countByStatus(
        QualityInspectionStatus.PASSED,
      ),
      countByStatus(
        QualityInspectionStatus.FAILED,
      ),
      countByStatus(
        QualityInspectionStatus.CANCELLED,
      ),
    ]);

    const openInspections =
      totalInspections -
      passedInspections -
      failedInspections -
      cancelledInspections;

    const totals =
      await this.inspectionRepository
        .createQueryBuilder(
          'inspection',
        )
        .select(
          'COALESCE(SUM(inspection.inspected_quantity), 0)',
          'inspected',
        )
        .addSelect(
          'COALESCE(SUM(inspection.accepted_quantity), 0)',
          'accepted',
        )
        .addSelect(
          'COALESCE(SUM(inspection.rejected_quantity), 0)',
          'rejected',
        )
        .where(
          'inspection.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'inspection.deleted_at IS NULL',
        )
        .andWhere(
          'inspection.inspection_date BETWEEN :dateFrom AND :dateTo',
          { dateFrom, dateTo },
        )
        .getRawOne<RawQualityTotals>();

    const inspected =
      Number(totals?.inspected ?? 0);
    const accepted =
      Number(totals?.accepted ?? 0);
    const rejected =
      Number(totals?.rejected ?? 0);

    const completed =
      passedInspections +
      failedInspections;

    return {
      dateFrom,
      dateTo,
      totalInspections,
      passedInspections,
      failedInspections,
      cancelledInspections,
      openInspections,
      totalInspectedQuantity:
        inspected,
      totalAcceptedQuantity:
        accepted,
      totalRejectedQuantity:
        rejected,
      passRatePercent:
        this.percent(
          passedInspections,
          completed,
        ),
      rejectionRatePercent:
        this.percent(
          rejected,
          inspected,
        ),
    };
  }

  private evaluateCheck(
    check: QualityInspectionCheckEntity,
  ): QualityCheckResult {
    if (
      check.actualNumericValue !==
      null
    ) {
      if (
        check.minimumValue !== null &&
        check.actualNumericValue <
          check.minimumValue
      ) {
        return QualityCheckResult.FAIL;
      }

      if (
        check.maximumValue !== null &&
        check.actualNumericValue >
          check.maximumValue
      ) {
        return QualityCheckResult.FAIL;
      }

      return QualityCheckResult.PASS;
    }

    if (check.actualText !== null) {
      if (
        check.expectedText !== null
      ) {
        return check.actualText
          .trim()
          .toLocaleLowerCase() ===
          check.expectedText
            .trim()
            .toLocaleLowerCase()
          ? QualityCheckResult.PASS
          : QualityCheckResult.FAIL;
      }

      return QualityCheckResult.PASS;
    }

    return QualityCheckResult.PENDING;
  }

  private validateCheckDefinitions(
    checks: QualityInspectionCheckEntity[],
  ): void {
    for (const check of checks) {
      if (
        check.minimumValue !== null &&
        check.maximumValue !== null &&
        check.maximumValue <
          check.minimumValue
      ) {
        throw new BadRequestException(
          `Maximum value cannot be lower than minimum value for check "${check.checkName}".`,
        );
      }
    }
  }

  private validateSource(
    sourceType:
      QualityInspectionSourceType,
    sourceId?: string,
  ): void {
    if (
      sourceType !==
        QualityInspectionSourceType.MANUAL &&
      !sourceId
    ) {
      throw new BadRequestException(
        'sourceId is required for non-manual quality inspections.',
      );
    }
  }

  private ensureUniqueCheckNames(
    names: string[],
  ): void {
    const normalized =
      names.map((name) =>
        name.trim().toLocaleLowerCase(),
      );

    if (
      new Set(normalized).size !==
      normalized.length
    ) {
      throw new BadRequestException(
        'Duplicate quality checks are not allowed.',
      );
    }
  }

  private ensureEditable(
    inspection: QualityInspectionEntity,
  ): void {
    if (
      inspection.status !==
      QualityInspectionStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft inspections can be edited.',
      );
    }
  }

  private async getEntity(
    companyId: string,
    id: string,
  ): Promise<QualityInspectionEntity> {
    const entity =
      await this.inspectionRepository.findOne({
        where: { id, companyId },
        relations: {
          checks: true,
        },
      });

    if (!entity) {
      throw new NotFoundException(
        'Quality inspection not found.',
      );
    }

    return entity;
  }

  private async generateNumber(
    companyId: string,
    inspectionDate: string,
    repository:
      Repository<QualityInspectionEntity>,
  ): Promise<string> {
    const year =
      new Date(
        `${inspectionDate.slice(
          0,
          10,
        )}T00:00:00.000Z`,
      ).getUTCFullYear();

    const prefix = `QI-${year}-`;

    const latest =
      await repository
        .createQueryBuilder(
          'inspection',
        )
        .withDeleted()
        .select(
          'inspection.inspection_number',
          'inspectionNumber',
        )
        .where(
          'inspection.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'inspection.inspection_number LIKE :prefix',
          {
            prefix: `${prefix}%`,
          },
        )
        .orderBy(
          'inspection.inspection_number',
          'DESC',
        )
        .getRawOne<{
          inspectionNumber?: string;
        }>();

    const current =
      latest?.inspectionNumber
        ? Number(
            latest.inspectionNumber.replace(
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
    if (!dateFrom || !dateTo) {
      return;
    }

    if (
      new Date(dateFrom).getTime() >
      new Date(dateTo).getTime()
    ) {
      throw new BadRequestException(
        'dateFrom must be earlier than or equal to dateTo.',
      );
    }
  }

  private percent(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator <= 0) {
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

  private toResponse(
    entity: QualityInspectionEntity,
  ): QualityInspectionResponseDto {
    return {
      id: entity.id,
      companyId: entity.companyId,
      inspectionNumber:
        entity.inspectionNumber,
      inspectionDate:
        entity.inspectionDate,
      sourceType: entity.sourceType,
      sourceId: entity.sourceId,
      itemId: entity.itemId,
      warehouseId:
        entity.warehouseId,
      status: entity.status,
      inspectedQuantity:
        Number(
          entity.inspectedQuantity,
        ),
      acceptedQuantity:
        Number(
          entity.acceptedQuantity,
        ),
      rejectedQuantity:
        Number(
          entity.rejectedQuantity,
        ),
      inspectorId:
        entity.inspectorId,
      completedAt:
        entity.completedAt,
      failureReason:
        entity.failureReason,
      notes: entity.notes,
      checks:
        (entity.checks ?? []).map(
          (check) =>
            this.toCheckResponse(
              check,
            ),
        ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toCheckResponse(
    check: QualityInspectionCheckEntity,
  ): QualityInspectionCheckResponseDto {
    return {
      id: check.id,
      checkName: check.checkName,
      specification:
        check.specification,
      minimumValue:
        check.minimumValue,
      maximumValue:
        check.maximumValue,
      actualNumericValue:
        check.actualNumericValue,
      expectedText:
        check.expectedText,
      actualText: check.actualText,
      result: check.result,
      isMandatory:
        check.isMandatory,
      remarks: check.remarks,
    };
  }
}
