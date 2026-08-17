import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditLogEntity } from '../users/entities/audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { AuditLogListResult } from './interfaces/audit-log-list-result.interface';
import type {
  AuditActionSummary,
  AuditEntityTypeSummary,
  AuditLogSummary,
} from './interfaces/audit-log-summary.interface';
import type { CreateAuditLogInput } from './interfaces/create-audit-log.interface';
import { sanitizeAuditValues } from './utils/sanitize-audit-values.util';

interface RawCountRow {
  value: string;
  count: string;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  async record(input: CreateAuditLogInput): Promise<AuditLogEntity> {
    const entityType = input.entityType.trim();
    const entityId = input.entityId.trim();

    if (!entityType) {
      throw new BadRequestException('Audit entity type is required');
    }
    if (!entityId) {
      throw new BadRequestException('Audit entity ID is required');
    }

    const auditLog = this.repository.create({
      companyId: input.companyId,
      userId: input.userId,
      action: input.action,
      entityType,
      entityId,
      oldValues: sanitizeAuditValues(input.oldValues),
      newValues: sanitizeAuditValues(input.newValues),
      ipAddress: this.normalizeOptional(input.ipAddress),
      userAgent: this.normalizeOptional(input.userAgent),
    });

    return this.repository.save(auditLog);
  }

  async findAll(
    companyId: string,
    query: AuditLogQueryDto,
  ): Promise<AuditLogListResult> {
    this.validateDateRange(query.dateFrom, query.dateTo);

    const builder = this.repository
      .createQueryBuilder('audit')
      .where('audit.companyId = :companyId', { companyId });

    if (query.action) {
      builder.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.entityType?.trim()) {
      builder.andWhere('audit.entityType = :entityType', {
        entityType: query.entityType.trim(),
      });
    }
    if (query.entityId) {
      builder.andWhere('audit.entityId = :entityId', {
        entityId: query.entityId,
      });
    }
    if (query.userId) {
      builder.andWhere('audit.userId = :userId', { userId: query.userId });
    }
    if (query.dateFrom) {
      builder.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      builder.andWhere('audit.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('audit.entityType ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('CAST(audit.entityId AS text) ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('audit.ipAddress ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('audit.userAgent ILIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }

    const [data, total] = await builder
      .orderBy('audit.createdAt', 'DESC')
      .addOrderBy('audit.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    };
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<AuditLogEntity> {
    const auditLog = await this.repository.findOne({
      where: { id, companyId },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found');
    }

    return auditLog;
  }

  async getSummary(
    companyId: string,
    query: AuditLogQueryDto,
  ): Promise<AuditLogSummary> {
    this.validateDateRange(query.dateFrom, query.dateTo);

    const base = this.repository
      .createQueryBuilder('audit')
      .where('audit.companyId = :companyId', { companyId });

    if (query.dateFrom) {
      base.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      base.andWhere('audit.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    const total = await base.clone().getCount();

    const actionRows = await base
      .clone()
      .select('audit.action', 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<RawCountRow>();

    const entityRows = await base
      .clone()
      .select('audit.entityType', 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.entityType')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<RawCountRow>();

    const byAction: AuditActionSummary[] = actionRows.map((row) => ({
      action: row.value as AuditActionSummary['action'],
      count: Number(row.count),
    }));

    const byEntityType: AuditEntityTypeSummary[] = entityRows.map((row) => ({
      entityType: row.value,
      count: Number(row.count),
    }));

    return { total, byAction, byEntityType };
  }

  private validateDateRange(dateFrom?: string, dateTo?: string): void {
    if (
      dateFrom &&
      dateTo &&
      new Date(dateFrom).getTime() > new Date(dateTo).getTime()
    ) {
      throw new BadRequestException(
        'dateFrom must be earlier than or equal to dateTo',
      );
    }
  }

  private normalizeOptional(
    value: string | null | undefined,
  ): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
