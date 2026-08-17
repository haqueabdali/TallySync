import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BackgroundJobQueryDto } from './dto/background-job-query.dto';
import { CreateBackgroundJobDto } from './dto/create-background-job.dto';
import { BackgroundJobEntity } from './entities/background-job.entity';
import { BackgroundJobStatus } from './enums/background-job-status.enum';
import type { BackgroundJobHandler } from './interfaces/background-job-handler.interface';

interface ClaimedJobRow {
  id: string;
}

export interface BackgroundJobListResult {
  data: BackgroundJobEntity[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
@Injectable()
export class BackgroundJobsService {
  private readonly handlers = new Map<string, BackgroundJobHandler>();

  constructor(
    @InjectRepository(BackgroundJobEntity)
    private readonly repository: Repository<BackgroundJobEntity>,
    private readonly dataSource: DataSource,
  ) {}

  registerHandler(type: string, handler: BackgroundJobHandler): void {
    const normalizedType = type.trim();

    if (!normalizedType) {
      throw new BadRequestException('Background job type is required');
    }

    if (this.handlers.has(normalizedType)) {
      throw new ConflictException(
        `A background job handler is already registered for ${normalizedType}`,
      );
    }

    this.handlers.set(normalizedType, handler);
  }

  unregisterHandler(type: string): void {
    this.handlers.delete(type.trim());
  }

  async enqueue(
    companyId: string,
    dto: CreateBackgroundJobDto,
  ): Promise<BackgroundJobEntity> {
    const normalizedIdempotencyKey =
      dto.idempotencyKey?.trim() || null;

    if (normalizedIdempotencyKey) {
      const existing = await this.repository.findOne({
        where: {
          companyId,
          idempotencyKey: normalizedIdempotencyKey,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const entity = this.repository.create({
      companyId,
      type: dto.type.trim(),
      queue: dto.queue?.trim() || null,
      payload: dto.payload,
      result: null,
      maxAttempts: dto.maxAttempts ?? 3,
      priority: dto.priority ?? 0,
      availableAt: dto.availableAt
        ? new Date(dto.availableAt)
        : new Date(),
      idempotencyKey: normalizedIdempotencyKey,
      status: BackgroundJobStatus.PENDING,
    });

    try {
      return await this.repository.save(entity);
    } catch (error: unknown) {
      if (
        normalizedIdempotencyKey &&
        this.isUniqueViolation(error)
      ) {
        const existing = await this.repository.findOne({
          where: {
            companyId,
            idempotencyKey: normalizedIdempotencyKey,
          },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async findAll(
    companyId: string,
    query: BackgroundJobQueryDto,
  ): Promise<BackgroundJobListResult> {
    const queryBuilder = this.repository
      .createQueryBuilder('job')
      .where('job.companyId = :companyId', { companyId });

    if (query.status) {
      queryBuilder.andWhere('job.status = :status', {
        status: query.status,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('job.type = :type', {
        type: query.type.trim(),
      });
    }

    if (query.queue) {
      queryBuilder.andWhere('job.queue = :queue', {
        queue: query.queue.trim(),
      });
    }

    queryBuilder
      .orderBy('job.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [data, total] = await queryBuilder.getManyAndCount();

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
  ): Promise<BackgroundJobEntity> {
    const job = await this.repository.findOne({
      where: {
        id,
        companyId,
      },
    });

    if (!job) {
      throw new NotFoundException('Background job not found');
    }

    return job;
  }

  async cancel(
    companyId: string,
    id: string,
  ): Promise<BackgroundJobEntity> {
    const job = await this.findOne(companyId, id);

    if (
      job.status !== BackgroundJobStatus.PENDING &&
      job.status !== BackgroundJobStatus.FAILED
    ) {
      throw new ConflictException(
        `A ${job.status} background job cannot be cancelled`,
      );
    }

    job.status = BackgroundJobStatus.CANCELLED;
    job.cancelledAt = new Date();
    job.lockedAt = null;
    job.lockedBy = null;

    return this.repository.save(job);
  }

  async retry(
    companyId: string,
    id: string,
  ): Promise<BackgroundJobEntity> {
    const job = await this.findOne(companyId, id);

    if (job.status !== BackgroundJobStatus.FAILED) {
      throw new ConflictException(
        'Only failed background jobs can be retried',
      );
    }

    job.status = BackgroundJobStatus.PENDING;
    job.availableAt = new Date();
    job.errorMessage = null;
    job.failedAt = null;
    job.completedAt = null;
    job.cancelledAt = null;
    job.lockedAt = null;
    job.lockedBy = null;

    return this.repository.save(job);
  }

  async getStats(
    companyId: string,
  ): Promise<Record<BackgroundJobStatus, number>> {
    const rows = await this.repository
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('job.companyId = :companyId', { companyId })
      .groupBy('job.status')
      .getRawMany<{
        status: BackgroundJobStatus;
        count: string;
      }>();

    const stats: Record<BackgroundJobStatus, number> = {
      [BackgroundJobStatus.PENDING]: 0,
      [BackgroundJobStatus.PROCESSING]: 0,
      [BackgroundJobStatus.COMPLETED]: 0,
      [BackgroundJobStatus.FAILED]: 0,
      [BackgroundJobStatus.CANCELLED]: 0,
    };

    for (const row of rows) {
      stats[row.status] = Number(row.count);
    }

    return stats;
  }

  async processNext(workerId: string): Promise<boolean> {
    const normalizedWorkerId = workerId.trim();

    if (!normalizedWorkerId) {
      throw new BadRequestException('Worker ID is required');
    }

    const job = await this.claimNext(normalizedWorkerId);

    if (!job) {
      return false;
    }

    const handler = this.handlers.get(job.type);

    if (!handler) {
      await this.markFailure(
        job,
        `No background job handler is registered for type ${job.type}`,
      );

      return true;
    }

    try {
      const result = await handler.execute(job.payload, {
        jobId: job.id,
        companyId: job.companyId,
        attempt: job.attempts,
      });

      await this.markCompleted(job.id, result ?? {});
    } catch (error: unknown) {
      await this.markFailure(
        job,
        this.getErrorMessage(error),
      );
    }

    return true;
  }

  async recoverStaleJobs(
    staleAfterSeconds: number,
  ): Promise<number> {
    if (
      !Number.isFinite(staleAfterSeconds) ||
      staleAfterSeconds <= 0
    ) {
      throw new BadRequestException(
        'Stale job timeout must be greater than zero',
      );
    }

    const threshold = new Date(
      Date.now() - staleAfterSeconds * 1000,
    );

    const result = await this.repository
      .createQueryBuilder()
      .update(BackgroundJobEntity)
      .set({
        status: BackgroundJobStatus.PENDING,
        lockedAt: null,
        lockedBy: null,
        availableAt: new Date(),
        errorMessage: 'Recovered after worker lock timeout',
      })
      .where('status = :status', {
        status: BackgroundJobStatus.PROCESSING,
      })
      .andWhere('"lockedAt" < :threshold', { threshold })
      .execute();

    return result.affected ?? 0;
  }

  private async markCompleted(
    jobId: string,
    result: Record<string, unknown>,
  ): Promise<void> {
    const completedJob = await this.repository.findOne({
      where: {
        id: jobId,
        status: BackgroundJobStatus.PROCESSING,
      },
    });

    if (!completedJob) {
      throw new NotFoundException(
        `Processing background job ${jobId} was not found`,
      );
    }

    completedJob.status = BackgroundJobStatus.COMPLETED;
    completedJob.result = result;
    completedJob.completedAt = new Date();
    completedJob.failedAt = null;
    completedJob.cancelledAt = null;
    completedJob.lockedAt = null;
    completedJob.lockedBy = null;
    completedJob.errorMessage = null;

    await this.repository.save(completedJob);
  }

  private async claimNext(
    workerId: string,
  ): Promise<BackgroundJobEntity | null> {
    const rows = await this.dataSource.query<ClaimedJobRow[]>(
      `
        WITH candidate AS (
          SELECT id
          FROM background_jobs
          WHERE status = $1
            AND "availableAt" <= CURRENT_TIMESTAMP
          ORDER BY
            priority DESC,
            "availableAt" ASC,
            "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE background_jobs AS job
        SET
          status = $2,
          attempts = job.attempts + 1,
          "startedAt" = COALESCE(
            job."startedAt",
            CURRENT_TIMESTAMP
          ),
          "lockedAt" = CURRENT_TIMESTAMP,
          "lockedBy" = $3,
          "updatedAt" = CURRENT_TIMESTAMP
        FROM candidate
        WHERE job.id = candidate.id
        RETURNING job.id
      `,
      [
        BackgroundJobStatus.PENDING,
        BackgroundJobStatus.PROCESSING,
        workerId,
      ],
    );

    const claimed = rows[0];

    if (!claimed) {
      return null;
    }

    return this.repository.findOne({
      where: {
        id: claimed.id,
        status: BackgroundJobStatus.PROCESSING,
      },
    });
  }

  private async markFailure(
    job: BackgroundJobEntity,
    message: string,
  ): Promise<void> {
    const currentJob = await this.repository.findOne({
      where: {
        id: job.id,
        status: BackgroundJobStatus.PROCESSING,
      },
    });

    if (!currentJob) {
      return;
    }

    const exhausted =
      currentJob.attempts >= currentJob.maxAttempts;

    const delaySeconds = Math.min(
      3600,
      30 * 2 ** Math.max(0, currentJob.attempts - 1),
    );

    currentJob.status = exhausted
      ? BackgroundJobStatus.FAILED
      : BackgroundJobStatus.PENDING;

    currentJob.availableAt = exhausted
      ? currentJob.availableAt
      : new Date(Date.now() + delaySeconds * 1000);

    currentJob.failedAt = exhausted ? new Date() : null;
    currentJob.completedAt = null;
    currentJob.errorMessage = message.substring(0, 10000);
    currentJob.lockedAt = null;
    currentJob.lockedBy = null;

    await this.repository.save(currentJob);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown background job error';
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }
}