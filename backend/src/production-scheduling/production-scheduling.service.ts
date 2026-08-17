import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateProductionScheduleDto } from './dto/create-production-schedule.dto';
import { ProductionScheduleQueryDto } from './dto/production-schedule-query.dto';
import {
  PaginatedProductionSchedulesResponseDto,
  ProductionScheduleResponseDto,
} from './dto/production-schedule-response.dto';
import { RescheduleProductionDto } from './dto/reschedule-production.dto';
import { UpdateProductionScheduleDto } from './dto/update-production-schedule.dto';
import { ProductionScheduleEntity } from './entities/production-schedule.entity';
import { ProductionSchedulePriority } from './enums/production-schedule-priority.enum';
import { ProductionScheduleStatus } from './enums/production-schedule-status.enum';

@Injectable()
export class ProductionSchedulingService {
  constructor(
    @InjectRepository(ProductionScheduleEntity)
    private readonly repository: Repository<ProductionScheduleEntity>,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateProductionScheduleDto,
  ): Promise<ProductionScheduleResponseDto> {
    const start = new Date(dto.plannedStartAt);
    const end = new Date(dto.plannedEndAt);
    this.validateWindow(start, end);

    await this.ensureOrderHasNoOpenSchedule(
      companyId,
      dto.productionOrderId,
    );

    const schedule = this.repository.create({
      companyId,
      productionOrderId: dto.productionOrderId,
      scheduleNumber: await this.generateNumber(companyId, start),
      plannedStartAt: start,
      plannedEndAt: end,
      actualStartAt: null,
      actualEndAt: null,
      status: ProductionScheduleStatus.PLANNED,
      priority: dto.priority ?? ProductionSchedulePriority.NORMAL,
      workCenterCode: this.optional(dto.workCenterCode),
      notes: this.optional(dto.notes),
      createdBy: userId,
      updatedBy: userId,
    });

    return this.toResponse(await this.repository.save(schedule));
  }

  async findAll(
    companyId: string,
    query: ProductionScheduleQueryDto,
  ): Promise<PaginatedProductionSchedulesResponseDto> {
    const qb = this.repository
      .createQueryBuilder('schedule')
      .where('schedule.company_id = :companyId', { companyId })
      .andWhere('schedule.deleted_at IS NULL');

    if (query.productionOrderId) {
      qb.andWhere('schedule.production_order_id = :productionOrderId', {
        productionOrderId: query.productionOrderId,
      });
    }
    if (query.status) {
      qb.andWhere('schedule.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('schedule.priority = :priority', { priority: query.priority });
    }
    if (query.workCenterCode?.trim()) {
      qb.andWhere('schedule.work_center_code = :workCenterCode', {
        workCenterCode: query.workCenterCode.trim(),
      });
    }
    if (query.dateFrom) {
      qb.andWhere('schedule.planned_end_at >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      qb.andWhere('schedule.planned_start_at <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    const [data, total] = await qb
      .orderBy('schedule.planned_start_at', 'ASC')
      .addOrderBy('schedule.priority', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: data.map((item) => this.toResponse(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<ProductionScheduleResponseDto> {
    return this.toResponse(await this.getEntity(companyId, id));
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateProductionScheduleDto,
  ): Promise<ProductionScheduleResponseDto> {
    const schedule = await this.getEntity(companyId, id);

    if (
      schedule.status !== ProductionScheduleStatus.PLANNED &&
      schedule.status !== ProductionScheduleStatus.SCHEDULED
    ) {
      throw new ConflictException(
        'Only planned or scheduled production can be edited.',
      );
    }

    const start = dto.plannedStartAt
      ? new Date(dto.plannedStartAt)
      : schedule.plannedStartAt;
    const end = dto.plannedEndAt
      ? new Date(dto.plannedEndAt)
      : schedule.plannedEndAt;
    this.validateWindow(start, end);

    if (
      dto.productionOrderId &&
      dto.productionOrderId !== schedule.productionOrderId
    ) {
      await this.ensureOrderHasNoOpenSchedule(
        companyId,
        dto.productionOrderId,
        schedule.id,
      );
      schedule.productionOrderId = dto.productionOrderId;
    }

    schedule.plannedStartAt = start;
    schedule.plannedEndAt = end;
    if (dto.priority) schedule.priority = dto.priority;
    if (dto.workCenterCode !== undefined) {
      schedule.workCenterCode = this.optional(dto.workCenterCode);
    }
    if (dto.notes !== undefined) {
      schedule.notes = this.optional(dto.notes);
    }
    schedule.updatedBy = userId;

    return this.toResponse(await this.repository.save(schedule));
  }

  async schedule(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<ProductionScheduleResponseDto> {
    const entity = await this.getEntity(companyId, id);
    if (entity.status !== ProductionScheduleStatus.PLANNED) {
      throw new ConflictException('Only planned production can be scheduled.');
    }
    entity.status = ProductionScheduleStatus.SCHEDULED;
    entity.updatedBy = userId;
    return this.toResponse(await this.repository.save(entity));
  }

  async start(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<ProductionScheduleResponseDto> {
    const entity = await this.getEntity(companyId, id);
    if (entity.status !== ProductionScheduleStatus.SCHEDULED) {
      throw new ConflictException('Only scheduled production can be started.');
    }
    entity.status = ProductionScheduleStatus.IN_PROGRESS;
    entity.actualStartAt = new Date();
    entity.updatedBy = userId;
    return this.toResponse(await this.repository.save(entity));
  }

  async complete(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<ProductionScheduleResponseDto> {
    const entity = await this.getEntity(companyId, id);
    if (entity.status !== ProductionScheduleStatus.IN_PROGRESS) {
      throw new ConflictException('Only in-progress production can be completed.');
    }
    entity.status = ProductionScheduleStatus.COMPLETED;
    entity.actualEndAt = new Date();
    entity.updatedBy = userId;
    return this.toResponse(await this.repository.save(entity));
  }

  async cancel(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<ProductionScheduleResponseDto> {
    const entity = await this.getEntity(companyId, id);
    if (
      entity.status === ProductionScheduleStatus.COMPLETED ||
      entity.status === ProductionScheduleStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Completed or cancelled production cannot be cancelled.',
      );
    }
    entity.status = ProductionScheduleStatus.CANCELLED;
    entity.updatedBy = userId;
    return this.toResponse(await this.repository.save(entity));
  }

  async reschedule(
    companyId: string,
    userId: string,
    id: string,
    dto: RescheduleProductionDto,
  ): Promise<ProductionScheduleResponseDto> {
    const entity = await this.getEntity(companyId, id);
    if (
      entity.status !== ProductionScheduleStatus.PLANNED &&
      entity.status !== ProductionScheduleStatus.SCHEDULED
    ) {
      throw new ConflictException(
        'Only planned or scheduled production can be rescheduled.',
      );
    }

    const start = new Date(dto.plannedStartAt);
    const end = new Date(dto.plannedEndAt);
    this.validateWindow(start, end);
    entity.plannedStartAt = start;
    entity.plannedEndAt = end;
    entity.notes = this.appendReason(entity.notes, dto.reason);
    entity.updatedBy = userId;

    return this.toResponse(await this.repository.save(entity));
  }

  async gantt(
    companyId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ProductionScheduleResponseDto[]> {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    this.validateWindow(start, end);

    const rows = await this.repository
      .createQueryBuilder('schedule')
      .where('schedule.company_id = :companyId', { companyId })
      .andWhere('schedule.deleted_at IS NULL')
      .andWhere('schedule.status != :cancelled', {
        cancelled: ProductionScheduleStatus.CANCELLED,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('schedule.planned_start_at BETWEEN :start AND :end', {
            start,
            end,
          }).orWhere('schedule.planned_end_at BETWEEN :start AND :end', {
            start,
            end,
          }).orWhere(
            'schedule.planned_start_at <= :start AND schedule.planned_end_at >= :end',
            { start, end },
          );
        }),
      )
      .orderBy('schedule.planned_start_at', 'ASC')
      .getMany();

    return rows.map((row) => this.toResponse(row));
  }

  private async ensureOrderHasNoOpenSchedule(
    companyId: string,
    productionOrderId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.repository
      .createQueryBuilder('schedule')
      .where('schedule.company_id = :companyId', { companyId })
      .andWhere('schedule.production_order_id = :productionOrderId', {
        productionOrderId,
      })
      .andWhere('schedule.deleted_at IS NULL')
      .andWhere('schedule.status NOT IN (:...closed)', {
        closed: [
          ProductionScheduleStatus.COMPLETED,
          ProductionScheduleStatus.CANCELLED,
        ],
      });

    if (excludeId) {
      qb.andWhere('schedule.id != :excludeId', { excludeId });
    }

    if ((await qb.getCount()) > 0) {
      throw new ConflictException(
        'This production order already has an open schedule.',
      );
    }
  }

  private async getEntity(
    companyId: string,
    id: string,
  ): Promise<ProductionScheduleEntity> {
    const entity = await this.repository.findOne({
      where: { id, companyId },
    });
    if (!entity) {
      throw new NotFoundException('Production schedule not found.');
    }
    return entity;
  }

  private async generateNumber(
    companyId: string,
    plannedStartAt: Date,
  ): Promise<string> {
    const year = plannedStartAt.getUTCFullYear();
    const prefix = `PS-${year}-`;
    const latest = await this.repository
      .createQueryBuilder('schedule')
      .withDeleted()
      .select('schedule.schedule_number', 'scheduleNumber')
      .where('schedule.company_id = :companyId', { companyId })
      .andWhere('schedule.schedule_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('schedule.schedule_number', 'DESC')
      .getRawOne<{ scheduleNumber?: string }>();

    const current = latest?.scheduleNumber
      ? Number(latest.scheduleNumber.replace(prefix, ''))
      : 0;

    return `${prefix}${String(current + 1).padStart(6, '0')}`;
  }

  private validateWindow(start: Date, end: Date): void {
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new BadRequestException('Invalid production schedule date.');
    }
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException(
        'plannedEndAt must be later than plannedStartAt.',
      );
    }
  }

  private optional(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private appendReason(
    notes: string | null,
    reason?: string,
  ): string | null {
    const normalized = reason?.trim();
    if (!normalized) return notes;
    const entry = `Rescheduled: ${normalized}`;
    return notes ? `${notes}\n${entry}` : entry;
  }

  private toResponse(
    entity: ProductionScheduleEntity,
  ): ProductionScheduleResponseDto {
    return {
      id: entity.id,
      companyId: entity.companyId,
      productionOrderId: entity.productionOrderId,
      scheduleNumber: entity.scheduleNumber,
      plannedStartAt: entity.plannedStartAt,
      plannedEndAt: entity.plannedEndAt,
      actualStartAt: entity.actualStartAt,
      actualEndAt: entity.actualEndAt,
      status: entity.status,
      priority: entity.priority,
      workCenterCode: entity.workCenterCode,
      notes: entity.notes,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
