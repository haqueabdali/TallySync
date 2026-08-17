import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ProductionScheduleEntity } from '../production-scheduling/entities/production-schedule.entity';
import { ProductionScheduleStatus } from '../production-scheduling/enums/production-schedule-status.enum';
import { CapacityReportQueryDto } from './dto/capacity-report-query.dto';
import {
  CapacityDayDto,
  CapacityReportResponseDto,
  WorkCenterCapacityDto,
} from './dto/capacity-report-response.dto';
import { CreateWorkCenterDto } from './dto/create-work-center.dto';
import { SetCapacityOverrideDto } from './dto/set-capacity-override.dto';
import { UpdateWorkCenterDto } from './dto/update-work-center.dto';
import { WorkCenterResponseDto } from './dto/work-center-response.dto';
import { WorkCenterCapacityOverrideEntity } from './entities/work-center-capacity-override.entity';
import { WorkCenterEntity } from './entities/work-center.entity';

interface DayWindow {
  date: string;
  start: Date;
  end: Date;
}

@Injectable()
export class CapacityPlanningService {
  constructor(
    @InjectRepository(WorkCenterEntity)
    private readonly workCenterRepository: Repository<WorkCenterEntity>,
    @InjectRepository(WorkCenterCapacityOverrideEntity)
    private readonly overrideRepository:
      Repository<WorkCenterCapacityOverrideEntity>,
    @InjectRepository(ProductionScheduleEntity)
    private readonly scheduleRepository: Repository<ProductionScheduleEntity>,
  ) {}

  async createWorkCenter(
    companyId: string,
    userId: string,
    dto: CreateWorkCenterDto,
  ): Promise<WorkCenterResponseDto> {
    const code = this.normalizeCode(dto.code);
    await this.ensureCodeAvailable(companyId, code);

    const workingDays = this.normalizeWorkingDays(
      dto.workingDays ?? [1, 2, 3, 4, 5],
    );

    const entity = this.workCenterRepository.create({
      companyId,
      code,
      name: dto.name.trim(),
      dailyCapacityMinutes: dto.dailyCapacityMinutes,
      efficiencyPercent: dto.efficiencyPercent ?? 100,
      workingDays,
      isActive: dto.isActive ?? true,
      notes: this.optional(dto.notes),
      createdBy: userId,
      updatedBy: userId,
    });

    return this.toWorkCenterResponse(
      await this.workCenterRepository.save(entity),
    );
  }

  async listWorkCenters(
    companyId: string,
  ): Promise<WorkCenterResponseDto[]> {
    const rows = await this.workCenterRepository.find({
      where: { companyId },
      order: { code: 'ASC' },
    });

    return rows.map((row) => this.toWorkCenterResponse(row));
  }

  async updateWorkCenter(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateWorkCenterDto,
  ): Promise<WorkCenterResponseDto> {
    const entity = await this.getWorkCenter(companyId, id);

    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code !== entity.code) {
        await this.ensureCodeAvailable(companyId, code, entity.id);
        entity.code = code;
      }
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Work center name is required.');
      }
      entity.name = name;
    }
    if (dto.dailyCapacityMinutes !== undefined) {
      entity.dailyCapacityMinutes = dto.dailyCapacityMinutes;
    }
    if (dto.efficiencyPercent !== undefined) {
      entity.efficiencyPercent = dto.efficiencyPercent;
    }
    if (dto.workingDays !== undefined) {
      entity.workingDays = this.normalizeWorkingDays(dto.workingDays);
    }
    if (dto.isActive !== undefined) {
      entity.isActive = dto.isActive;
    }
    if (dto.notes !== undefined) {
      entity.notes = this.optional(dto.notes);
    }

    entity.updatedBy = userId;

    return this.toWorkCenterResponse(
      await this.workCenterRepository.save(entity),
    );
  }

  async setCapacityOverride(
    companyId: string,
    userId: string,
    workCenterId: string,
    dto: SetCapacityOverrideDto,
  ): Promise<WorkCenterCapacityOverrideEntity> {
    await this.getWorkCenter(companyId, workCenterId);

    const capacityDate = dto.capacityDate.slice(0, 10);

    let entity = await this.overrideRepository.findOne({
      where: {
        companyId,
        workCenterId,
        capacityDate,
      },
    });

    if (!entity) {
      entity = this.overrideRepository.create({
        companyId,
        workCenterId,
        capacityDate,
        availableMinutes: dto.availableMinutes,
        reason: this.optional(dto.reason),
        createdBy: userId,
        updatedBy: userId,
      });
    } else {
      entity.availableMinutes = dto.availableMinutes;
      entity.reason = this.optional(dto.reason);
      entity.updatedBy = userId;
    }

    return this.overrideRepository.save(entity);
  }

  async getCapacityReport(
    companyId: string,
    query: CapacityReportQueryDto,
  ): Promise<CapacityReportResponseDto> {
    const windows = this.buildDayWindows(
      query.dateFrom,
      query.dateTo,
    );

    const workCenterWhere = query.workCenterCode?.trim()
      ? {
          companyId,
          code: this.normalizeCode(query.workCenterCode),
          isActive: true,
        }
      : {
          companyId,
          isActive: true,
        };

    const workCenters = await this.workCenterRepository.find({
      where: workCenterWhere,
      order: { code: 'ASC' },
    });

    if (
      query.workCenterCode &&
      workCenters.length === 0
    ) {
      throw new NotFoundException('Work center not found.');
    }

    const codes = workCenters.map((center) => center.code);
    const ids = workCenters.map((center) => center.id);

    const overrides = ids.length
      ? await this.overrideRepository
          .createQueryBuilder('override')
          .where('override.company_id = :companyId', {
            companyId,
          })
          .andWhere('override.work_center_id IN (:...ids)', {
            ids,
          })
          .andWhere(
            'override.capacity_date BETWEEN :dateFrom AND :dateTo',
            {
              dateFrom: windows[0].date,
              dateTo: windows[windows.length - 1].date,
            },
          )
          .getMany()
      : [];

    const schedules = codes.length
      ? await this.scheduleRepository
          .createQueryBuilder('schedule')
          .where('schedule.company_id = :companyId', {
            companyId,
          })
          .andWhere(
            'schedule.work_center_code IN (:...codes)',
            { codes },
          )
          .andWhere('schedule.deleted_at IS NULL')
          .andWhere('schedule.status NOT IN (:...closed)', {
            closed: [
              ProductionScheduleStatus.CANCELLED,
              ProductionScheduleStatus.COMPLETED,
            ],
          })
          .andWhere(
            'schedule.planned_end_at > :rangeStart',
            { rangeStart: windows[0].start },
          )
          .andWhere(
            'schedule.planned_start_at < :rangeEnd',
            {
              rangeEnd:
                windows[windows.length - 1].end,
            },
          )
          .getMany()
      : [];

    const overrideMap = new Map<string, number>();
    for (const override of overrides) {
      overrideMap.set(
        `${override.workCenterId}:${override.capacityDate}`,
        override.availableMinutes,
      );
    }

    const workCenterReports = workCenters.map((center) =>
      this.buildWorkCenterCapacity(
        center,
        windows,
        schedules.filter(
          (schedule) =>
            schedule.workCenterCode === center.code,
        ),
        overrideMap,
      ),
    );

    const totalCapacityMinutes =
      workCenterReports.reduce(
        (sum, center) =>
          sum + center.totalCapacityMinutes,
        0,
      );

    const totalScheduledMinutes =
      workCenterReports.reduce(
        (sum, center) =>
          sum + center.totalScheduledMinutes,
        0,
      );

    return {
      dateFrom: windows[0].date,
      dateTo: windows[windows.length - 1].date,
      workCenters: workCenterReports,
      totalCapacityMinutes,
      totalScheduledMinutes,
      utilizationPercent: this.percent(
        totalScheduledMinutes,
        totalCapacityMinutes,
      ),
      bottleneckWorkCenters:
        workCenterReports.filter(
          (center) => center.bottleneckDays > 0,
        ).length,
    };
  }

  private buildWorkCenterCapacity(
    center: WorkCenterEntity,
    windows: DayWindow[],
    schedules: ProductionScheduleEntity[],
    overrideMap: Map<string, number>,
  ): WorkCenterCapacityDto {
    const days: CapacityDayDto[] = windows.map(
      (window) => {
        const isWorkingDay = center.workingDays.includes(
          window.start.getUTCDay(),
        );

        const nominalMinutes = isWorkingDay
          ? center.dailyCapacityMinutes
          : 0;

        const override = overrideMap.get(
          `${center.id}:${window.date}`,
        );

        const baseCapacity =
          override ?? nominalMinutes;

        const effectiveCapacityMinutes =
          Math.round(
            baseCapacity *
              (center.efficiencyPercent / 100),
          );

        const scheduledMinutes = schedules.reduce(
          (sum, schedule) =>
            sum +
            this.overlapMinutes(
              schedule.plannedStartAt,
              schedule.plannedEndAt,
              window.start,
              window.end,
            ),
          0,
        );

        const availableMinutes =
          effectiveCapacityMinutes -
          scheduledMinutes;

        const overloadMinutes = Math.max(
          0,
          -availableMinutes,
        );

        return {
          date: window.date,
          nominalMinutes,
          effectiveCapacityMinutes,
          scheduledMinutes,
          availableMinutes: Math.max(
            0,
            availableMinutes,
          ),
          utilizationPercent: this.percent(
            scheduledMinutes,
            effectiveCapacityMinutes,
          ),
          overloadMinutes,
          isBottleneck: overloadMinutes > 0,
        };
      },
    );

    const totalCapacityMinutes = days.reduce(
      (sum, day) =>
        sum + day.effectiveCapacityMinutes,
      0,
    );
    const totalScheduledMinutes = days.reduce(
      (sum, day) => sum + day.scheduledMinutes,
      0,
    );

    return {
      workCenterId: center.id,
      workCenterCode: center.code,
      workCenterName: center.name,
      days,
      totalCapacityMinutes,
      totalScheduledMinutes,
      utilizationPercent: this.percent(
        totalScheduledMinutes,
        totalCapacityMinutes,
      ),
      bottleneckDays: days.filter(
        (day) => day.isBottleneck,
      ).length,
    };
  }

  private async ensureCodeAvailable(
    companyId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.workCenterRepository.findOne({
      where: {
        companyId,
        code,
      },
      withDeleted: true,
    });

    if (
      existing &&
      existing.deletedAt === null &&
      existing.id !== excludeId
    ) {
      throw new ConflictException(
        `Work center ${code} already exists.`,
      );
    }
  }

  private async getWorkCenter(
    companyId: string,
    id: string,
  ): Promise<WorkCenterEntity> {
    const entity =
      await this.workCenterRepository.findOne({
        where: { id, companyId },
      });

    if (!entity) {
      throw new NotFoundException(
        'Work center not found.',
      );
    }

    return entity;
  }

  private normalizeCode(value: string): string {
    const code = value.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException(
        'Work center code is required.',
      );
    }
    return code;
  }

  private normalizeWorkingDays(
    values: number[],
  ): number[] {
    const unique = [...new Set(values)].sort(
      (a, b) => a - b,
    );

    if (
      unique.length === 0 ||
      unique.some((value) => value < 0 || value > 6)
    ) {
      throw new BadRequestException(
        'workingDays must contain UTC weekday numbers from 0 to 6.',
      );
    }

    return unique;
  }

  private buildDayWindows(
    dateFrom: string,
    dateTo: string,
  ): DayWindow[] {
    const start = new Date(
      `${dateFrom.slice(0, 10)}T00:00:00.000Z`,
    );
    const end = new Date(
      `${dateTo.slice(0, 10)}T00:00:00.000Z`,
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new BadRequestException(
        'Invalid capacity report date range.',
      );
    }

    if (end.getTime() < start.getTime()) {
      throw new BadRequestException(
        'dateTo must be on or after dateFrom.',
      );
    }

    const differenceDays =
      Math.floor(
        (end.getTime() - start.getTime()) /
          86_400_000,
      ) + 1;

    if (differenceDays > 366) {
      throw new BadRequestException(
        'Capacity report range cannot exceed 366 days.',
      );
    }

    const windows: DayWindow[] = [];

    for (let index = 0; index < differenceDays; index += 1) {
      const dayStart = new Date(
        start.getTime() + index * 86_400_000,
      );
      const dayEnd = new Date(
        dayStart.getTime() + 86_400_000,
      );

      windows.push({
        date: dayStart.toISOString().slice(0, 10),
        start: dayStart,
        end: dayEnd,
      });
    }

    return windows;
  }

  private overlapMinutes(
    start: Date,
    end: Date,
    windowStart: Date,
    windowEnd: Date,
  ): number {
    const overlapStart = Math.max(
      start.getTime(),
      windowStart.getTime(),
    );
    const overlapEnd = Math.min(
      end.getTime(),
      windowEnd.getTime(),
    );

    if (overlapEnd <= overlapStart) {
      return 0;
    }

    return Math.round(
      (overlapEnd - overlapStart) / 60_000,
    );
  }

  private percent(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator <= 0) {
      return numerator > 0 ? 100 : 0;
    }

    return Math.round(
      ((numerator / denominator) * 100 +
        Number.EPSILON) *
        100,
    ) / 100;
  }

  private optional(
    value?: string | null,
  ): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toWorkCenterResponse(
    entity: WorkCenterEntity,
  ): WorkCenterResponseDto {
    return {
      id: entity.id,
      companyId: entity.companyId,
      code: entity.code,
      name: entity.name,
      dailyCapacityMinutes:
        entity.dailyCapacityMinutes,
      efficiencyPercent:
        entity.efficiencyPercent,
      workingDays: entity.workingDays,
      isActive: entity.isActive,
      notes: entity.notes,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }
}
