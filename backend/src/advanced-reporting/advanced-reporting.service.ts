import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CapacityPlanningService } from '../capacity-planning/capacity-planning.service';
import { CapacityReportQueryDto } from '../capacity-planning/dto/capacity-report-query.dto';
import { MaintenanceAssetEntity } from '../maintenance-management/entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from '../maintenance-management/entities/maintenance-downtime.entity';
import { MaintenanceWorkOrderEntity } from '../maintenance-management/entities/maintenance-work-order.entity';
import { MaintenanceAssetStatus } from '../maintenance-management/enums/maintenance-asset-status.enum';
import { MaintenanceWorkOrderStatus } from '../maintenance-management/enums/maintenance-work-order-status.enum';
import { MaintenanceWorkOrderType } from '../maintenance-management/enums/maintenance-work-order-type.enum';
import { ProductionScheduleEntity } from '../production-scheduling/entities/production-schedule.entity';
import { ProductionScheduleStatus } from '../production-scheduling/enums/production-schedule-status.enum';
import { QualityInspectionEntity } from '../quality-management/entities/quality-inspection.entity';
import { QualityInspectionStatus } from '../quality-management/enums/quality-inspection-status.enum';
import { AdvancedReportQueryDto } from './dto/advanced-report-query.dto';
import {
  CapacityDashboardSummaryDto,
  ManufacturingAlertDto,
  ManufacturingDashboardResponseDto,
} from './dto/manufacturing-dashboard-response.dto';
import { MaintenancePerformanceResponseDto } from './dto/maintenance-performance-response.dto';
import { ProductionPerformanceResponseDto } from './dto/production-performance-response.dto';
import { QualityPerformanceResponseDto } from './dto/quality-performance-response.dto';

interface RawCountRow {
  status: string;
  count: string;
}

interface RawQualityTotals {
  inspected: string | null;
  accepted: string | null;
  rejected: string | null;
}

@Injectable()
export class AdvancedReportingService {
  constructor(
    @InjectRepository(ProductionScheduleEntity)
    private readonly scheduleRepository:
      Repository<ProductionScheduleEntity>,

    @InjectRepository(QualityInspectionEntity)
    private readonly qualityRepository:
      Repository<QualityInspectionEntity>,

    @InjectRepository(MaintenanceAssetEntity)
    private readonly maintenanceAssetRepository:
      Repository<MaintenanceAssetEntity>,

    @InjectRepository(MaintenanceWorkOrderEntity)
    private readonly maintenanceWorkOrderRepository:
      Repository<MaintenanceWorkOrderEntity>,

    @InjectRepository(MaintenanceDowntimeEntity)
    private readonly downtimeRepository:
      Repository<MaintenanceDowntimeEntity>,

    private readonly capacityPlanningService:
      CapacityPlanningService,
  ) {}

  async getProductionPerformance(
    companyId: string,
    query: AdvancedReportQueryDto,
  ): Promise<ProductionPerformanceResponseDto> {
    const { dateFrom, dateTo, rangeStart, rangeEnd } =
      this.parseRange(query);

    const qb = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.company_id = :companyId', {
        companyId,
      })
      .andWhere('schedule.deleted_at IS NULL')
      .andWhere(
        'schedule.planned_start_at < :rangeEnd',
        { rangeEnd },
      )
      .andWhere(
        'schedule.planned_end_at >= :rangeStart',
        { rangeStart },
      );

    if (query.workCenterCode?.trim()) {
      qb.andWhere(
        'schedule.work_center_code = :workCenterCode',
        {
          workCenterCode:
            query.workCenterCode.trim(),
        },
      );
    }

    const schedules = await qb
      .orderBy('schedule.planned_start_at', 'ASC')
      .getMany();

    const counts = this.countProductionStatuses(
      schedules,
    );

    const completedRows = schedules.filter(
      (schedule) =>
        schedule.status ===
        ProductionScheduleStatus.COMPLETED,
    );

    const completedOnTime =
      completedRows.filter(
        (schedule) =>
          schedule.actualEndAt !== null &&
          schedule.actualEndAt.getTime() <=
            schedule.plannedEndAt.getTime(),
      ).length;

    const completedLate =
      completedRows.length - completedOnTime;

    const totalPlannedMinutes =
      schedules.reduce(
        (sum, schedule) =>
          sum +
          this.durationMinutes(
            schedule.plannedStartAt,
            schedule.plannedEndAt,
          ),
        0,
      );

    const totalActualMinutes =
      completedRows.reduce(
        (sum, schedule) => {
          if (
            !schedule.actualStartAt ||
            !schedule.actualEndAt
          ) {
            return sum;
          }

          return (
            sum +
            this.durationMinutes(
              schedule.actualStartAt,
              schedule.actualEndAt,
            )
          );
        },
        0,
      );

    return {
      dateFrom,
      dateTo,
      totalSchedules: schedules.length,
      planned: counts.planned,
      scheduled: counts.scheduled,
      inProgress: counts.inProgress,
      completed: counts.completed,
      cancelled: counts.cancelled,
      completedOnTime,
      completedLate,
      completionRatePercent:
        this.percent(
          counts.completed,
          schedules.length -
            counts.cancelled,
        ),
      onTimeCompletionPercent:
        this.percent(
          completedOnTime,
          completedRows.length,
        ),
      totalPlannedMinutes,
      totalActualMinutes,
      averageActualMinutes:
        completedRows.length === 0
          ? 0
          : Math.round(
              totalActualMinutes /
                completedRows.length,
            ),
    };
  }

  async getQualityPerformance(
    companyId: string,
    query: AdvancedReportQueryDto,
  ): Promise<QualityPerformanceResponseDto> {
    const { dateFrom, dateTo } =
      this.parseRange(query);

    const statusRows =
      await this.qualityRepository
        .createQueryBuilder('inspection')
        .select('inspection.status', 'status')
        .addSelect('COUNT(*)', 'count')
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
        .groupBy('inspection.status')
        .getRawMany<RawCountRow>();

    const totals =
      await this.qualityRepository
        .createQueryBuilder('inspection')
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

    const counts =
      this.mapQualityStatusCounts(statusRows);

    const inspected =
      Number(totals?.inspected ?? 0);
    const accepted =
      Number(totals?.accepted ?? 0);
    const rejected =
      Number(totals?.rejected ?? 0);

    const completed =
      counts.passed + counts.failed;

    return {
      dateFrom,
      dateTo,
      totalInspections:
        counts.total,
      passed: counts.passed,
      failed: counts.failed,
      open: counts.open,
      cancelled: counts.cancelled,
      inspectedQuantity: inspected,
      acceptedQuantity: accepted,
      rejectedQuantity: rejected,
      passRatePercent:
        this.percent(
          counts.passed,
          completed,
        ),
      rejectionRatePercent:
        this.percent(
          rejected,
          inspected,
        ),
    };
  }

  async getMaintenancePerformance(
    companyId: string,
    query: AdvancedReportQueryDto,
  ): Promise<MaintenancePerformanceResponseDto> {
    const { dateFrom, dateTo, rangeStart, rangeEnd } =
      this.parseRange(query);

    const [
      totalAssets,
      activeAssets,
      outOfServiceAssets,
      workOrders,
      downtimeLogs,
    ] = await Promise.all([
      this.maintenanceAssetRepository.count({
        where: { companyId },
      }),
      this.maintenanceAssetRepository.count({
        where: {
          companyId,
          status:
            MaintenanceAssetStatus.ACTIVE,
        },
      }),
      this.maintenanceAssetRepository.count({
        where: {
          companyId,
          status:
            MaintenanceAssetStatus.OUT_OF_SERVICE,
        },
      }),
      this.maintenanceWorkOrderRepository
        .createQueryBuilder('workOrder')
        .where(
          'workOrder.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          `(
            workOrder.created_at < :rangeEnd
            AND (
              workOrder.actual_end_at IS NULL
              OR workOrder.actual_end_at >= :rangeStart
            )
          )`,
          { rangeStart, rangeEnd },
        )
        .getMany(),
      this.downtimeRepository
        .createQueryBuilder('downtime')
        .where(
          'downtime.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'downtime.started_at < :rangeEnd',
          { rangeEnd },
        )
        .andWhere(
          `(
            downtime.ended_at IS NULL
            OR downtime.ended_at >= :rangeStart
          )`,
          { rangeStart },
        )
        .getMany(),
    ]);

    const openWorkOrders =
      workOrders.filter(
        (order) =>
          order.status ===
            MaintenanceWorkOrderStatus.OPEN ||
          order.status ===
            MaintenanceWorkOrderStatus.SCHEDULED ||
          order.status ===
            MaintenanceWorkOrderStatus.IN_PROGRESS,
      ).length;

    const completedOrders =
      workOrders.filter(
        (order) =>
          order.status ===
            MaintenanceWorkOrderStatus.COMPLETED &&
          order.actualEndAt !== null &&
          order.actualEndAt >= rangeStart &&
          order.actualEndAt < rangeEnd,
      );

    const emergencyWorkOrders =
      workOrders.filter(
        (order) =>
          order.type ===
          MaintenanceWorkOrderType.EMERGENCY,
      ).length;

    const maintenanceCost =
      completedOrders.reduce(
        (sum, order) =>
          sum +
          Number(order.laborCost) +
          Number(order.partsCost),
        0,
      );

    const now = new Date();

    const downtimeMinutes =
      downtimeLogs.reduce(
        (sum, row) => {
          const effectiveStart =
            Math.max(
              row.startedAt.getTime(),
              rangeStart.getTime(),
            );

          const effectiveEnd =
            Math.min(
              (
                row.endedAt ?? now
              ).getTime(),
              rangeEnd.getTime(),
            );

          if (
            effectiveEnd <=
            effectiveStart
          ) {
            return sum;
          }

          return (
            sum +
            Math.round(
              (effectiveEnd -
                effectiveStart) /
                60_000,
            )
          );
        },
        0,
      );

    return {
      dateFrom,
      dateTo,
      totalAssets,
      activeAssets,
      outOfServiceAssets,
      openWorkOrders,
      completedWorkOrders:
        completedOrders.length,
      emergencyWorkOrders,
      downtimeMinutes,
      maintenanceCost:
        this.roundMoney(
          maintenanceCost,
        ),
      averageMaintenanceCost:
        completedOrders.length === 0
          ? 0
          : this.roundMoney(
              maintenanceCost /
                completedOrders.length,
            ),
    };
  }

  async getDashboard(
    companyId: string,
    query: AdvancedReportQueryDto,
  ): Promise<ManufacturingDashboardResponseDto> {
    const range = this.parseRange(query);

    const capacityQuery:
      CapacityReportQueryDto = {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        ...(query.workCenterCode?.trim()
          ? {
              workCenterCode:
                query.workCenterCode.trim(),
            }
          : {}),
      };

    const [
      production,
      capacityReport,
      quality,
      maintenance,
    ] = await Promise.all([
      this.getProductionPerformance(
        companyId,
        query,
      ),
      this.capacityPlanningService.getCapacityReport(
        companyId,
        capacityQuery,
      ),
      this.getQualityPerformance(
        companyId,
        query,
      ),
      this.getMaintenancePerformance(
        companyId,
        query,
      ),
    ]);

    const capacity:
      CapacityDashboardSummaryDto = {
        totalCapacityMinutes:
          capacityReport.totalCapacityMinutes,
        totalScheduledMinutes:
          capacityReport.totalScheduledMinutes,
        utilizationPercent:
          capacityReport.utilizationPercent,
        bottleneckWorkCenters:
          capacityReport.bottleneckWorkCenters,
      };

    return {
      generatedAt: new Date(),
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      production,
      capacity,
      quality,
      maintenance,
      alerts: this.buildAlerts(
        production,
        capacity,
        quality,
        maintenance,
      ),
    };
  }

  private buildAlerts(
    production:
      ProductionPerformanceResponseDto,
    capacity:
      CapacityDashboardSummaryDto,
    quality:
      QualityPerformanceResponseDto,
    maintenance:
      MaintenancePerformanceResponseDto,
  ): ManufacturingAlertDto[] {
    const alerts:
      ManufacturingAlertDto[] = [];

    if (
      capacity.bottleneckWorkCenters >
      0
    ) {
      alerts.push({
        severity: 'critical',
        code: 'CAPACITY_BOTTLENECK',
        message:
          'One or more work centers are overloaded.',
        value:
          capacity.bottleneckWorkCenters,
      });
    }

    if (
      quality.rejectionRatePercent >
      5
    ) {
      alerts.push({
        severity: 'warning',
        code: 'HIGH_REJECTION_RATE',
        message:
          'Quality rejection rate exceeds 5%.',
        value:
          quality.rejectionRatePercent,
      });
    }

    if (
      production.completedLate > 0
    ) {
      alerts.push({
        severity: 'warning',
        code: 'LATE_PRODUCTION',
        message:
          'Production schedules were completed late.',
        value:
          production.completedLate,
      });
    }

    if (
      maintenance.outOfServiceAssets >
      0
    ) {
      alerts.push({
        severity: 'critical',
        code: 'ASSETS_OUT_OF_SERVICE',
        message:
          'Maintenance assets are currently out of service.',
        value:
          maintenance.outOfServiceAssets,
      });
    }

    if (
      maintenance.openWorkOrders > 0
    ) {
      alerts.push({
        severity: 'info',
        code: 'OPEN_MAINTENANCE',
        message:
          'Maintenance work orders remain open.',
        value:
          maintenance.openWorkOrders,
      });
    }

    return alerts;
  }

  private countProductionStatuses(
    rows: ProductionScheduleEntity[],
  ): {
    planned: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  } {
    return {
      planned: rows.filter(
        (row) =>
          row.status ===
          ProductionScheduleStatus.PLANNED,
      ).length,
      scheduled: rows.filter(
        (row) =>
          row.status ===
          ProductionScheduleStatus.SCHEDULED,
      ).length,
      inProgress: rows.filter(
        (row) =>
          row.status ===
          ProductionScheduleStatus.IN_PROGRESS,
      ).length,
      completed: rows.filter(
        (row) =>
          row.status ===
          ProductionScheduleStatus.COMPLETED,
      ).length,
      cancelled: rows.filter(
        (row) =>
          row.status ===
          ProductionScheduleStatus.CANCELLED,
      ).length,
    };
  }

  private mapQualityStatusCounts(
    rows: RawCountRow[],
  ): {
    total: number;
    passed: number;
    failed: number;
    cancelled: number;
    open: number;
  } {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let cancelled = 0;
    let open = 0;

    for (const row of rows) {
      const count = Number(row.count);
      total += count;

      if (
        row.status ===
        QualityInspectionStatus.PASSED
      ) {
        passed += count;
      } else if (
        row.status ===
        QualityInspectionStatus.FAILED
      ) {
        failed += count;
      } else if (
        row.status ===
        QualityInspectionStatus.CANCELLED
      ) {
        cancelled += count;
      } else {
        open += count;
      }
    }

    return {
      total,
      passed,
      failed,
      cancelled,
      open,
    };
  }

  private parseRange(
    query: AdvancedReportQueryDto,
  ): {
    dateFrom: string;
    dateTo: string;
    rangeStart: Date;
    rangeEnd: Date;
  } {
    const dateFrom =
      query.dateFrom.slice(0, 10);
    const dateTo =
      query.dateTo.slice(0, 10);

    const rangeStart =
      new Date(
        `${dateFrom}T00:00:00.000Z`,
      );

    const inclusiveEnd =
      new Date(
        `${dateTo}T00:00:00.000Z`,
      );

    if (
      Number.isNaN(
        rangeStart.getTime(),
      ) ||
      Number.isNaN(
        inclusiveEnd.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Invalid report date range.',
      );
    }

    if (
      inclusiveEnd.getTime() <
      rangeStart.getTime()
    ) {
      throw new BadRequestException(
        'dateTo must be on or after dateFrom.',
      );
    }

    const rangeDays =
      Math.floor(
        (inclusiveEnd.getTime() -
          rangeStart.getTime()) /
          86_400_000,
      ) + 1;

    if (rangeDays > 366) {
      throw new BadRequestException(
        'Advanced report range cannot exceed 366 days.',
      );
    }

    const rangeEnd =
      new Date(
        inclusiveEnd.getTime() +
          86_400_000,
      );

    return {
      dateFrom,
      dateTo,
      rangeStart,
      rangeEnd,
    };
  }

  private durationMinutes(
    start: Date,
    end: Date,
  ): number {
    if (
      end.getTime() <=
      start.getTime()
    ) {
      return 0;
    }

    return Math.round(
      (end.getTime() -
        start.getTime()) /
        60_000,
    );
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

  private roundMoney(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100;
  }
}
