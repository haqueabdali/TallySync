import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { UserEntity } from '../auth/entities/user.entity';
import { LicenseEntity } from './entities/license.entity';
import { LicenseSessionEntity } from './entities/license-session.entity';
import { LicensingService } from './licensing.service';

export interface OpenLicenseSessionInput {
  user: UserEntity;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LicenseSessionService {
  private readonly activeWindowSeconds: number;
  private readonly touchIntervalSeconds: number;
  private readonly enforceConcurrentSessions: boolean;

  constructor(
    @InjectRepository(LicenseSessionEntity)
    private readonly sessionRepository: Repository<LicenseSessionEntity>,
    @InjectRepository(LicenseEntity)
    private readonly licenseRepository: Repository<LicenseEntity>,
    private readonly licensingService: LicensingService,
    private readonly configService: ConfigService,
  ) {
    this.activeWindowSeconds = this.readPositiveInteger(
      'LICENSE_SESSION_ACTIVE_WINDOW_SECONDS',
      900,
    );
    this.touchIntervalSeconds = this.readPositiveInteger(
      'LICENSE_SESSION_TOUCH_INTERVAL_SECONDS',
      60,
    );
    this.enforceConcurrentSessions =
      this.configService.get<string>('LICENSE_ENFORCE_CONCURRENT_SESSIONS') ===
      'true';
  }

  async openSession(
    input: OpenLicenseSessionInput,
  ): Promise<LicenseSessionEntity> {
    const now = new Date();
    let licenseId: string | null = null;
    let maxConcurrentUsers: number | null = null;

    if (input.user.companyId) {
      if (this.enforceConcurrentSessions) {
        const entitlement = await this.licensingService.getCompanyEntitlement(
          input.user.companyId,
        );
        licenseId = entitlement.licenseId;
        maxConcurrentUsers = entitlement.maxConcurrentUsers;
      } else {
        const license = await this.licenseRepository.findOne({
          where: {
            companyId: input.user.companyId,
            deletedAt: IsNull(),
          },
          select: { id: true },
        });
        licenseId = license?.id ?? null;
      }
    }

    return this.sessionRepository.manager.transaction(async (manager) => {
      if (
        input.user.companyId &&
        this.enforceConcurrentSessions &&
        maxConcurrentUsers !== null
      ) {
        await this.acquireCompanySessionLock(manager, input.user.companyId);
        await this.assertConcurrentCapacityWithManager(
          manager,
          input.user.companyId,
          input.user.id,
          maxConcurrentUsers,
          now,
        );
      }

      const repo = manager.getRepository(LicenseSessionEntity);
      const session = repo.create({
        licenseId,
        companyId: input.user.companyId,
        userId: input.user.id,
        isRevoked: false,
        lastSeenAt: now,
        expiresAt: input.expiresAt,
        revokedAt: null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent?.slice(0, 1024) ?? null,
      });

      return repo.save(session);
    });
  }

  async assertAndTouchSession(
    sessionId: string,
    userId: string,
    companyId: string | null,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (
      !session ||
      session.userId !== userId ||
      session.companyId !== companyId
    ) {
      throw new UnauthorizedException('Authentication session is invalid');
    }
    if (session.isRevoked || session.revokedAt) {
      throw new UnauthorizedException(
        'Authentication session has been revoked',
      );
    }

    const now = new Date();
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Authentication session has expired');
    }

    const activeCutoff = new Date(
      now.getTime() - this.activeWindowSeconds * 1000,
    );

    if (
      companyId &&
      this.enforceConcurrentSessions &&
      session.lastSeenAt.getTime() < activeCutoff.getTime()
    ) {
      const entitlement =
        await this.licensingService.getCompanyEntitlement(companyId);
      if (entitlement.maxConcurrentUsers !== null) {
        await this.sessionRepository.manager.transaction(async (manager) => {
          await this.acquireCompanySessionLock(manager, companyId);
          await this.assertConcurrentCapacityWithManager(
            manager,
            companyId,
            userId,
            entitlement.maxConcurrentUsers as number,
            now,
          );
        });
      }
    }

    const touchCutoff = new Date(
      now.getTime() - this.touchIntervalSeconds * 1000,
    );
    if (session.lastSeenAt.getTime() <= touchCutoff.getTime()) {
      await this.sessionRepository.update(session.id, { lastSeenAt: now });
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  async usageForLicense(licenseId: string): Promise<{
    activeSessions: number;
    concurrentUsers: number;
  }> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.activeWindowSeconds * 1000);

    const row = (await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(*)', 'activeSessions')
      .addSelect('COUNT(DISTINCT session.user_id)', 'concurrentUsers')
      .where('session.license_id = :licenseId', { licenseId })
      .andWhere('session.is_revoked = false')
      .andWhere('session.expires_at > :now', { now })
      .andWhere('session.last_seen_at >= :cutoff', { cutoff })
      .getRawOne()) as
      { activeSessions?: string; concurrentUsers?: string } | undefined;

    return {
      activeSessions: Number.parseInt(row?.activeSessions ?? '0', 10),
      concurrentUsers: Number.parseInt(row?.concurrentUsers ?? '0', 10),
    };
  }

  async listForLicense(
    licenseId: string,
    limit = 100,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      companyId: string | null;
      isRevoked: boolean;
      lastSeenAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      user: { id: string; fullName: string; email: string };
    }>
  > {
    const sessions = await this.sessionRepository.find({
      where: { licenseId },
      relations: { user: true },
      order: { lastSeenAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 250),
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      companyId: session.companyId,
      isRevoked: session.isRevoked,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      user: {
        id: session.user.id,
        fullName: session.user.fullName,
        email: session.user.email,
      },
    }));
  }

  async revokeForLicense(licenseId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, licenseId },
    });
    if (!session) throw new NotFoundException('License session not found');
    await this.revokeSession(session.id);
  }

  private async assertConcurrentCapacityWithManager(
    manager: Repository<LicenseSessionEntity>['manager'],
    companyId: string,
    userId: string,
    maxConcurrentUsers: number,
    now: Date,
  ): Promise<void> {
    const cutoff = new Date(now.getTime() - this.activeWindowSeconds * 1000);

    const rows = (await manager.query(
      `
        SELECT
          COUNT(DISTINCT user_id)::int AS concurrent_users,
          BOOL_OR(user_id = $2)::boolean AS current_user_active
        FROM license_sessions
        WHERE company_id = $1
          AND is_revoked = false
          AND expires_at > $3
          AND last_seen_at >= $4
      `,
      [companyId, userId, now, cutoff],
    )) as Array<{
      concurrent_users: number | string;
      current_user_active: boolean | null;
    }>;

    const concurrentUsers = Number(rows[0]?.concurrent_users ?? 0);
    const currentUserActive = rows[0]?.current_user_active === true;

    if (!currentUserActive && concurrentUsers >= maxConcurrentUsers) {
      throw new ForbiddenException(
        `Concurrent user limit reached (${concurrentUsers}/${maxConcurrentUsers})`,
      );
    }
  }

  private async acquireCompanySessionLock(
    manager: Repository<LicenseSessionEntity>['manager'],
    companyId: string,
  ): Promise<void> {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`license-session:${companyId}`],
    );
  }

  private readPositiveInteger(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) return fallback;
    const value = Number.parseInt(raw, 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
