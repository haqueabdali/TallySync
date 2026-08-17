import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CompleteMaintenanceWorkOrderDto } from './dto/complete-maintenance-work-order.dto';
import { CreateDowntimeLogDto } from './dto/create-downtime-log.dto';
import { CreateMaintenanceAssetDto } from './dto/create-maintenance-asset.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { CreateMaintenanceWorkOrderDto } from './dto/create-maintenance-work-order.dto';
import { MaintenanceReportQueryDto } from './dto/maintenance-report-query.dto';
import { MaintenanceReportResponseDto } from './dto/maintenance-report-response.dto';
import { UpdateMaintenanceAssetDto } from './dto/update-maintenance-asset.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenanceAssetEntity } from './entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from './entities/maintenance-downtime.entity';
import { MaintenancePlanEntity } from './entities/maintenance-plan.entity';
import { MaintenanceWorkOrderEntity } from './entities/maintenance-work-order.entity';
import { MaintenanceAssetStatus } from './enums/maintenance-asset-status.enum';
import { MaintenancePlanFrequency } from './enums/maintenance-plan-frequency.enum';
import { MaintenanceWorkOrderStatus } from './enums/maintenance-work-order-status.enum';

@Injectable()
export class MaintenanceManagementService {
  constructor(
    @InjectRepository(MaintenanceAssetEntity)
    private readonly assetRepository: Repository<MaintenanceAssetEntity>,
    @InjectRepository(MaintenancePlanEntity)
    private readonly planRepository: Repository<MaintenancePlanEntity>,
    @InjectRepository(MaintenanceWorkOrderEntity)
    private readonly workOrderRepository: Repository<MaintenanceWorkOrderEntity>,
    @InjectRepository(MaintenanceDowntimeEntity)
    private readonly downtimeRepository: Repository<MaintenanceDowntimeEntity>,
  ) {}

  async createAsset(
    companyId: string,
    userId: string,
    dto: CreateMaintenanceAssetDto,
  ): Promise<MaintenanceAssetEntity> {
    const assetCode = dto.assetCode.trim().toUpperCase();

    if (!assetCode) {
      throw new BadRequestException('Asset code is required.');
    }

    const existing = await this.assetRepository.findOne({
      where: { companyId, assetCode },
      withDeleted: true,
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException(`Asset ${assetCode} already exists.`);
    }

    const entity = this.assetRepository.create({
      companyId,
      assetCode,
      assetName: dto.assetName.trim(),
      category: this.optional(dto.category),
      manufacturer: this.optional(dto.manufacturer),
      model: this.optional(dto.model),
      serialNumber: this.optional(dto.serialNumber),
      location: this.optional(dto.location),
      status: dto.status ?? MaintenanceAssetStatus.ACTIVE,
      commissionedDate: dto.commissionedDate?.slice(0, 10) ?? null,
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
      notes: this.optional(dto.notes),
      createdBy: userId,
      updatedBy: userId,
    });

    return this.assetRepository.save(entity);
  }

  async listAssets(companyId: string): Promise<MaintenanceAssetEntity[]> {
    return this.assetRepository.find({
      where: { companyId },
      order: { assetCode: 'ASC' },
    });
  }

  async updateAsset(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateMaintenanceAssetDto,
  ): Promise<MaintenanceAssetEntity> {
    const entity = await this.getAsset(companyId, id);

    if (dto.assetCode !== undefined) {
      const nextCode = dto.assetCode.trim().toUpperCase();

      const existing = await this.assetRepository.findOne({
        where: { companyId, assetCode: nextCode },
        withDeleted: true,
      });

      if (
        existing &&
        existing.deletedAt === null &&
        existing.id !== entity.id
      ) {
        throw new ConflictException(`Asset ${nextCode} already exists.`);
      }

      entity.assetCode = nextCode;
    }

    if (dto.assetName !== undefined) entity.assetName = dto.assetName.trim();
    if (dto.category !== undefined) entity.category = this.optional(dto.category);
    if (dto.manufacturer !== undefined) entity.manufacturer = this.optional(dto.manufacturer);
    if (dto.model !== undefined) entity.model = this.optional(dto.model);
    if (dto.serialNumber !== undefined) entity.serialNumber = this.optional(dto.serialNumber);
    if (dto.location !== undefined) entity.location = this.optional(dto.location);
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.commissionedDate !== undefined) {
      entity.commissionedDate = dto.commissionedDate?.slice(0, 10) ?? null;
    }
    if (dto.notes !== undefined) entity.notes = this.optional(dto.notes);

    entity.updatedBy = userId;
    return this.assetRepository.save(entity);
  }

  async createPlan(
    companyId: string,
    userId: string,
    dto: CreateMaintenancePlanDto,
  ): Promise<MaintenancePlanEntity> {
    const asset = await this.getAsset(companyId, dto.assetId);

    if (asset.status === MaintenanceAssetStatus.RETIRED) {
      throw new ConflictException('Cannot create a maintenance plan for a retired asset.');
    }

    const startDate = dto.startDate.slice(0, 10);
    const nextDueDate = this.addFrequency(startDate, dto.frequency);

    const plan = this.planRepository.create({
      companyId,
      assetId: dto.assetId,
      planName: dto.planName.trim(),
      frequency: dto.frequency,
      startDate,
      nextDueDate,
      estimatedMinutes: dto.estimatedMinutes ?? 0,
      isActive: dto.isActive ?? true,
      instructions: this.optional(dto.instructions),
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.planRepository.save(plan);

    if (!asset.nextMaintenanceDate || saved.nextDueDate < asset.nextMaintenanceDate) {
      asset.nextMaintenanceDate = saved.nextDueDate;
      asset.updatedBy = userId;
      await this.assetRepository.save(asset);
    }

    return saved;
  }

  async updatePlan(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateMaintenancePlanDto,
  ): Promise<MaintenancePlanEntity> {
    const plan = await this.planRepository.findOne({
      where: { id, companyId },
    });

    if (!plan) {
      throw new NotFoundException('Maintenance plan not found.');
    }

    if (dto.assetId !== undefined) {
      await this.getAsset(companyId, dto.assetId);
      plan.assetId = dto.assetId;
    }
    if (dto.planName !== undefined) plan.planName = dto.planName.trim();
    if (dto.frequency !== undefined) plan.frequency = dto.frequency;
    if (dto.startDate !== undefined) plan.startDate = dto.startDate.slice(0, 10);
    if (dto.estimatedMinutes !== undefined) plan.estimatedMinutes = dto.estimatedMinutes;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;
    if (dto.instructions !== undefined) {
      plan.instructions = this.optional(dto.instructions);
    }

    plan.nextDueDate = this.addFrequency(plan.startDate, plan.frequency);
    plan.updatedBy = userId;

    return this.planRepository.save(plan);
  }

  async createWorkOrder(
    companyId: string,
    userId: string,
    dto: CreateMaintenanceWorkOrderDto,
  ): Promise<MaintenanceWorkOrderEntity> {
    const asset = await this.getAsset(companyId, dto.assetId);

    if (
      asset.status === MaintenanceAssetStatus.RETIRED ||
      asset.status === MaintenanceAssetStatus.INACTIVE
    ) {
      throw new ConflictException('Maintenance work cannot be created for this asset status.');
    }

    const start = dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null;
    const end = dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null;

    if (start && end && end.getTime() <= start.getTime()) {
      throw new BadRequestException('scheduledEndAt must be later than scheduledStartAt.');
    }

    if (dto.maintenancePlanId) {
      const plan = await this.planRepository.findOne({
        where: {
          id: dto.maintenancePlanId,
          companyId,
          assetId: dto.assetId,
        },
      });

      if (!plan) {
        throw new NotFoundException('Maintenance plan not found for this asset.');
      }
    }

    const order = this.workOrderRepository.create({
      companyId,
      assetId: dto.assetId,
      maintenancePlanId: dto.maintenancePlanId ?? null,
      workOrderNumber: await this.generateWorkOrderNumber(companyId),
      type: dto.type,
      status: start
        ? MaintenanceWorkOrderStatus.SCHEDULED
        : MaintenanceWorkOrderStatus.OPEN,
      scheduledStartAt: start,
      scheduledEndAt: end,
      actualStartAt: null,
      actualEndAt: null,
      assignedTo: dto.assignedTo ?? null,
      description: dto.description.trim(),
      resolutionNotes: null,
      laborCost: dto.laborCost ?? 0,
      partsCost: dto.partsCost ?? 0,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.workOrderRepository.save(order);
  }

  async startWorkOrder(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<MaintenanceWorkOrderEntity> {
    const order = await this.getWorkOrder(companyId, id);

    if (
      order.status !== MaintenanceWorkOrderStatus.OPEN &&
      order.status !== MaintenanceWorkOrderStatus.SCHEDULED
    ) {
      throw new ConflictException('Only open or scheduled work orders can be started.');
    }

    order.status = MaintenanceWorkOrderStatus.IN_PROGRESS;
    order.actualStartAt = new Date();
    order.updatedBy = userId;

    return this.workOrderRepository.save(order);
  }

  async completeWorkOrder(
    companyId: string,
    userId: string,
    id: string,
    dto: CompleteMaintenanceWorkOrderDto,
  ): Promise<MaintenanceWorkOrderEntity> {
    const order = await this.getWorkOrder(companyId, id);

    if (order.status !== MaintenanceWorkOrderStatus.IN_PROGRESS) {
      throw new ConflictException('Only in-progress work orders can be completed.');
    }

    order.status = MaintenanceWorkOrderStatus.COMPLETED;
    order.actualEndAt = new Date();
    if (dto.resolutionNotes !== undefined) {
      order.resolutionNotes = this.optional(dto.resolutionNotes);
    }
    if (dto.laborCost !== undefined) order.laborCost = dto.laborCost;
    if (dto.partsCost !== undefined) order.partsCost = dto.partsCost;
    order.updatedBy = userId;

    const completedAt = new Date();

order.status = MaintenanceWorkOrderStatus.COMPLETED;
order.actualEndAt = completedAt;

if (dto.resolutionNotes !== undefined) {
  order.resolutionNotes = this.optional(dto.resolutionNotes);
}

if (dto.laborCost !== undefined) {
  order.laborCost = dto.laborCost;
}

if (dto.partsCost !== undefined) {
  order.partsCost = dto.partsCost;
}

order.updatedBy = userId;

const saved = await this.workOrderRepository.save(order);

const asset = await this.getAsset(companyId, order.assetId);
const completedDate = completedAt.toISOString().slice(0, 10);
asset.lastMaintenanceDate = completedDate;

    if (order.maintenancePlanId) {
      const plan = await this.planRepository.findOne({
        where: {
          id: order.maintenancePlanId,
          companyId,
        },
      });

      if (plan) {
        plan.startDate = completedDate;
        plan.nextDueDate = this.addFrequency(completedDate, plan.frequency);
        plan.updatedBy = userId;
        await this.planRepository.save(plan);
        asset.nextMaintenanceDate = plan.nextDueDate;
      }
    }

    asset.updatedBy = userId;
    await this.assetRepository.save(asset);

    return saved;
  }

  async createDowntime(
    companyId: string,
    userId: string,
    dto: CreateDowntimeLogDto,
  ): Promise<MaintenanceDowntimeEntity> {
    await this.getAsset(companyId, dto.assetId);

    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;

    if (endedAt && endedAt.getTime() <= startedAt.getTime()) {
      throw new BadRequestException('endedAt must be later than startedAt.');
    }

    if (dto.workOrderId) {
      const workOrder = await this.getWorkOrder(companyId, dto.workOrderId);

      if (workOrder.assetId !== dto.assetId) {
        throw new BadRequestException('Downtime asset does not match work-order asset.');
      }
    }

    const entity = this.downtimeRepository.create({
      companyId,
      assetId: dto.assetId,
      workOrderId: dto.workOrderId ?? null,
      startedAt,
      endedAt,
      reason: dto.reason.trim(),
      notes: this.optional(dto.notes),
      createdBy: userId,
      updatedBy: userId,
    });

    return this.downtimeRepository.save(entity);
  }

  async closeDowntime(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<MaintenanceDowntimeEntity> {
    const entity = await this.downtimeRepository.findOne({
      where: { id, companyId },
    });

    if (!entity) {
      throw new NotFoundException('Downtime log not found.');
    }

    if (entity.endedAt) {
      throw new ConflictException('Downtime log is already closed.');
    }

    entity.endedAt = new Date();
    entity.updatedBy = userId;

    return this.downtimeRepository.save(entity);
  }

  async getReport(
    companyId: string,
    query: MaintenanceReportQueryDto,
  ): Promise<MaintenanceReportResponseDto> {
    const dateFrom = query.dateFrom.slice(0, 10);
    const dateTo = query.dateTo.slice(0, 10);

    if (new Date(dateFrom).getTime() > new Date(dateTo).getTime()) {
      throw new BadRequestException('dateFrom must be earlier than or equal to dateTo.');
    }

    const [
      totalAssets,
      activeAssets,
      openWorkOrders,
      completedWorkOrders,
      overduePlans,
      completedOrders,
      downtimeLogs,
    ] = await Promise.all([
      this.assetRepository.count({ where: { companyId } }),
      this.assetRepository.count({
        where: { companyId, status: MaintenanceAssetStatus.ACTIVE },
      }),
      this.workOrderRepository
        .createQueryBuilder('workOrder')
        .where('workOrder.company_id = :companyId', { companyId })
        .andWhere('workOrder.status IN (:...statuses)', {
          statuses: [
            MaintenanceWorkOrderStatus.OPEN,
            MaintenanceWorkOrderStatus.SCHEDULED,
            MaintenanceWorkOrderStatus.IN_PROGRESS,
          ],
        })
        .getCount(),
      this.workOrderRepository
        .createQueryBuilder('workOrder')
        .where('workOrder.company_id = :companyId', { companyId })
        .andWhere('workOrder.status = :status', {
          status: MaintenanceWorkOrderStatus.COMPLETED,
        })
        .andWhere('DATE(workOrder.actual_end_at) BETWEEN :dateFrom AND :dateTo', {
          dateFrom,
          dateTo,
        })
        .getCount(),
      this.planRepository
        .createQueryBuilder('plan')
        .where('plan.company_id = :companyId', { companyId })
        .andWhere('plan.deleted_at IS NULL')
        .andWhere('plan.is_active = true')
        .andWhere('plan.next_due_date < :today', {
          today: new Date().toISOString().slice(0, 10),
        })
        .getCount(),
      this.workOrderRepository
        .createQueryBuilder('workOrder')
        .where('workOrder.company_id = :companyId', { companyId })
        .andWhere('workOrder.status = :status', {
          status: MaintenanceWorkOrderStatus.COMPLETED,
        })
        .andWhere('DATE(workOrder.actual_end_at) BETWEEN :dateFrom AND :dateTo', {
          dateFrom,
          dateTo,
        })
        .getMany(),
      this.downtimeRepository
        .createQueryBuilder('downtime')
        .where('downtime.company_id = :companyId', { companyId })
        .andWhere('downtime.started_at < :rangeEnd', {
          rangeEnd: new Date(`${dateTo}T23:59:59.999Z`),
        })
        .andWhere(
          '(downtime.ended_at IS NULL OR downtime.ended_at > :rangeStart)',
          { rangeStart: new Date(`${dateFrom}T00:00:00.000Z`) },
        )
        .getMany(),
    ]);

    const maintenanceCost = completedOrders.reduce(
      (sum, order) => sum + Number(order.laborCost) + Number(order.partsCost),
      0,
    );

    const rangeStart = new Date(`${dateFrom}T00:00:00.000Z`);
    const rangeEnd = new Date(`${dateTo}T23:59:59.999Z`);

    const downtimeMinutes = downtimeLogs.reduce((sum, log) => {
      const start = Math.max(log.startedAt.getTime(), rangeStart.getTime());
      const rawEnd = log.endedAt ?? new Date();
      const end = Math.min(rawEnd.getTime(), rangeEnd.getTime());

      if (end <= start) return sum;
      return sum + Math.round((end - start) / 60_000);
    }, 0);

    return {
      dateFrom,
      dateTo,
      totalAssets,
      activeAssets,
      openWorkOrders,
      completedWorkOrders,
      overduePlans,
      downtimeMinutes,
      maintenanceCost: Math.round((maintenanceCost + Number.EPSILON) * 100) / 100,
    };
  }

  private async getAsset(
    companyId: string,
    id: string,
  ): Promise<MaintenanceAssetEntity> {
    const asset = await this.assetRepository.findOne({
      where: { id, companyId },
    });

    if (!asset) {
      throw new NotFoundException('Maintenance asset not found.');
    }

    return asset;
  }

  private async getWorkOrder(
    companyId: string,
    id: string,
  ): Promise<MaintenanceWorkOrderEntity> {
    const order = await this.workOrderRepository.findOne({
      where: { id, companyId },
    });

    if (!order) {
      throw new NotFoundException('Maintenance work order not found.');
    }

    return order;
  }

  private async generateWorkOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `MWO-${year}-`;

    const latest = await this.workOrderRepository
      .createQueryBuilder('workOrder')
      .select('workOrder.work_order_number', 'workOrderNumber')
      .where('workOrder.company_id = :companyId', { companyId })
      .andWhere('workOrder.work_order_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('workOrder.work_order_number', 'DESC')
      .getRawOne<{ workOrderNumber?: string }>();

    const current = latest?.workOrderNumber
      ? Number(latest.workOrderNumber.replace(prefix, ''))
      : 0;

    return `${prefix}${String(current + 1).padStart(6, '0')}`;
  }

  private addFrequency(
    date: string,
    frequency: MaintenancePlanFrequency,
  ): string {
    const value = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);

    switch (frequency) {
      case MaintenancePlanFrequency.DAILY:
        value.setUTCDate(value.getUTCDate() + 1);
        break;
      case MaintenancePlanFrequency.WEEKLY:
        value.setUTCDate(value.getUTCDate() + 7);
        break;
      case MaintenancePlanFrequency.MONTHLY:
        value.setUTCMonth(value.getUTCMonth() + 1);
        break;
      case MaintenancePlanFrequency.QUARTERLY:
        value.setUTCMonth(value.getUTCMonth() + 3);
        break;
      case MaintenancePlanFrequency.SEMI_ANNUAL:
        value.setUTCMonth(value.getUTCMonth() + 6);
        break;
      case MaintenancePlanFrequency.ANNUAL:
        value.setUTCFullYear(value.getUTCFullYear() + 1);
        break;
    }

    return value.toISOString().slice(0, 10);
  }

  private optional(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
