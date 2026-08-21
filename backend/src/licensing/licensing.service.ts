import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CommercialNotificationsService } from './commercial-notifications.service';
import { CreateLicenseActivationDto } from './dto/create-license-activation.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { LicenseHeartbeatDto } from './dto/license-heartbeat.dto';
import { ListLicenseAuditQueryDto } from './dto/list-license-audit-query.dto';
import { ListLicensesQueryDto } from './dto/list-licenses-query.dto';
import { ReplaceLicenseFeaturesDto } from './dto/replace-license-features.dto';
import { RenewLicenseDto } from './dto/renew-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { LicenseActivationEntity } from './entities/license-activation.entity';
import { LicenseAuditLogEntity } from './entities/license-audit-log.entity';
import { LicenseFeatureEntity } from './entities/license-feature.entity';
import { LicenseEntity } from './entities/license.entity';
import { LicenseActivationStatus } from './enums/license-activation-status.enum';
import { LicenseStatus } from './enums/license-status.enum';
import { getLicensePlanTemplates } from './license-plan-templates';
import { LicensedFeature } from './enums/licensed-feature.enum';
import type { LicenseEntitlement } from './interfaces/license-entitlement.interface';
import type {
  SignedLicenseCertificate,
  SignedLicenseCertificatePayload,
} from './interfaces/signed-license-certificate.interface';
import { LicenseSigningService } from './license-signing.service';

@Injectable()
export class LicensingService {
  constructor(
    @InjectRepository(LicenseEntity)
    private readonly licenseRepository: Repository<LicenseEntity>,
    @InjectRepository(LicenseFeatureEntity)
    private readonly featureRepository: Repository<LicenseFeatureEntity>,
    @InjectRepository(LicenseActivationEntity)
    private readonly activationRepository: Repository<LicenseActivationEntity>,
    @InjectRepository(LicenseAuditLogEntity)
    private readonly auditRepository: Repository<LicenseAuditLogEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly licenseSigningService?: LicenseSigningService,
    @Optional()
    private readonly commercialNotifications?: CommercialNotificationsService,
  ) {}

  async listAuditLogs(query: ListLicenseAuditQueryDto): Promise<{
    data: Array<{
      id: string;
      licenseId: string;
      action: string;
      metadata: Record<string, unknown> | null;
      ipAddress: string | null;
      createdAt: Date;
      actor: null | { id: string; fullName: string; email: string };
      license: { id: string; licenseNumber: string; companyId: string; companyName: string };
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .innerJoinAndSelect('audit.license', 'license')
      .innerJoinAndSelect('license.company', 'company')
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.licenseId) {
      qb.andWhere('audit.license_id = :licenseId', { licenseId: query.licenseId });
    }
    if (query.action?.trim()) {
      qb.andWhere('audit.action ILIKE :action', { action: `%${query.action.trim()}%` });
    }

    const [logs, total] = await qb.getManyAndCount();
    const actorIds = [...new Set(logs.map((log) => log.actorUserId).filter((id): id is string => Boolean(id)))];
    const actors = actorIds.length
      ? await this.userRepository.find({ where: { id: In(actorIds) } })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));

    return {
      data: logs.map((log) => {
        const actor = log.actorUserId ? actorById.get(log.actorUserId) : undefined;
        return {
          id: log.id,
          licenseId: log.licenseId,
          action: log.action,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
          actor: actor ? { id: actor.id, fullName: actor.fullName, email: actor.email } : null,
          license: {
            id: log.license.id,
            licenseNumber: log.license.licenseNumber,
            companyId: log.license.companyId,
            companyName: log.license.company?.name ?? log.license.companyId,
          },
        };
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async create(
    dto: CreateLicenseDto,
    actor: AuthenticatedUser,
  ): Promise<LicenseEntity> {
    await this.assertCompanyExists(dto.companyId);
    this.validateLimits(dto.maxUsers, dto.maxConcurrentUsers ?? null);
    this.validateDates(dto.validFrom ?? null, dto.expiresAt ?? null);
    this.validateVersionRange(
      dto.minimumVersion ?? null,
      dto.maximumVersion ?? null,
    );
    await this.assertMaxUsersNotBelowCurrentUsage(dto.companyId, dto.maxUsers);

    const existing = await this.licenseRepository.findOne({
      where: { companyId: dto.companyId, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException('Company already has a license');
    }

    const licenseNumber =
      dto.licenseNumber?.trim() || this.generateLicenseNumber();

    const duplicateNumber = await this.licenseRepository.findOne({
      where: { licenseNumber },
    });
    if (duplicateNumber) {
      throw new ConflictException('License number already exists');
    }

    const id = await this.dataSource.transaction(async (manager) => {
      const licenseRepo = manager.getRepository(LicenseEntity);
      const license = licenseRepo.create({
        companyId: dto.companyId,
        licenseNumber,
        plan: dto.plan,
        status: LicenseStatus.DRAFT,
        maxUsers: dto.maxUsers,
        maxConcurrentUsers: dto.maxConcurrentUsers ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        minimumVersion: dto.minimumVersion ?? null,
        maximumVersion: dto.maximumVersion ?? null,
        notes: dto.notes ?? null,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
      const saved = await licenseRepo.save(license);

      if (dto.features?.length) {
        await this.replaceFeaturesWithManager(manager, saved.id, dto.features);
      }

      await this.writeAuditWithManager(
        manager,
        saved.id,
        actor.id,
        'license.created',
        {
          companyId: saved.companyId,
          plan: saved.plan,
          maxUsers: saved.maxUsers,
        },
      );
      return saved.id;
    });

    return this.findOne(id);
  }

  async list(query: ListLicensesQueryDto): Promise<{
    data: LicenseEntity[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      deletedAt: IsNull(),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.plan ? { plan: query.plan } : {}),
    };

    const [data, total] = await this.licenseRepository.findAndCount({
      where,
      relations: { company: true, features: true, activations: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<LicenseEntity> {
    const license = await this.licenseRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { company: true, features: true, activations: true },
    });
    if (!license) throw new NotFoundException('License not found');
    return license;
  }

  async update(
    id: string,
    dto: UpdateLicenseDto,
    actor: AuthenticatedUser,
  ): Promise<LicenseEntity> {
    const license = await this.findOne(id);

    const maxUsers = dto.maxUsers ?? license.maxUsers;
    const maxConcurrentUsers =
      dto.maxConcurrentUsers !== undefined
        ? dto.maxConcurrentUsers
        : license.maxConcurrentUsers;
    const validFrom =
      dto.validFrom !== undefined
        ? dto.validFrom
          ? new Date(dto.validFrom)
          : null
        : license.validFrom;
    const expiresAt =
      dto.expiresAt !== undefined
        ? dto.expiresAt
          ? new Date(dto.expiresAt)
          : null
        : license.expiresAt;
    const minimumVersion =
      dto.minimumVersion !== undefined
        ? dto.minimumVersion
        : license.minimumVersion;
    const maximumVersion =
      dto.maximumVersion !== undefined
        ? dto.maximumVersion
        : license.maximumVersion;

    this.validateLimits(maxUsers, maxConcurrentUsers);
    this.validateDateObjects(validFrom, expiresAt);
    this.validateVersionRange(minimumVersion, maximumVersion);
    await this.assertMaxUsersNotBelowCurrentUsage(license.companyId, maxUsers);

    if (dto.plan !== undefined) license.plan = dto.plan;
    if (dto.maxUsers !== undefined) license.maxUsers = dto.maxUsers;
    if (dto.maxConcurrentUsers !== undefined) {
      license.maxConcurrentUsers = dto.maxConcurrentUsers;
    }
    if (dto.validFrom !== undefined) license.validFrom = validFrom;
    if (dto.expiresAt !== undefined) license.expiresAt = expiresAt;
    if (dto.minimumVersion !== undefined) {
      license.minimumVersion = dto.minimumVersion;
    }
    if (dto.maximumVersion !== undefined) {
      license.maximumVersion = dto.maximumVersion;
    }
    if (dto.notes !== undefined) license.notes = dto.notes;
    license.updatedBy = actor.id;
    this.invalidateSignedCertificate(license);

    await this.licenseRepository.save(license);
    await this.writeAudit(id, actor.id, 'license.updated', {
      plan: license.plan,
      maxUsers: license.maxUsers,
      maxConcurrentUsers: license.maxConcurrentUsers,
      minimumVersion: license.minimumVersion,
      maximumVersion: license.maximumVersion,
    });
    return this.findOne(id);
  }

  async renew(
    id: string,
    dto: RenewLicenseDto,
    actor: AuthenticatedUser,
  ): Promise<LicenseEntity> {
    const license = await this.findOne(id);
    if (license.status === LicenseStatus.REVOKED) {
      throw new BadRequestException('Revoked license cannot be renewed');
    }

    const nextExpiresAt = new Date(dto.expiresAt);
    if (Number.isNaN(nextExpiresAt.getTime())) {
      throw new BadRequestException('expiresAt must be a valid date');
    }
    if (nextExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Renewal expiration must be in the future');
    }
    if (license.validFrom && nextExpiresAt.getTime() <= license.validFrom.getTime()) {
      throw new BadRequestException('expiresAt must be after validFrom');
    }
    if (license.expiresAt && nextExpiresAt.getTime() <= license.expiresAt.getTime()) {
      throw new BadRequestException('Renewal expiration must extend the current expiration');
    }

    const previousExpiresAt = license.expiresAt;
    license.expiresAt = nextExpiresAt;
    if (license.status === LicenseStatus.EXPIRED) {
      license.status = LicenseStatus.ACTIVE;
    }
    license.updatedBy = actor.id;
    this.invalidateSignedCertificate(license);

    await this.licenseRepository.save(license);
    await this.writeAudit(id, actor.id, 'license.renewed', {
      previousExpiresAt: previousExpiresAt?.toISOString() ?? null,
      expiresAt: nextExpiresAt.toISOString(),
      renewalNote: dto.renewalNote?.trim() || null,
    });
    const renewed = await this.findOne(id);
    await this.commercialNotifications?.notifyCompanyAdmins(renewed, 'license.renewed', {
      previousExpiresAt: previousExpiresAt?.toISOString() ?? null,
      expiresAt: nextExpiresAt.toISOString(),
    });
    return renewed;
  }

  async activate(id: string, actor: AuthenticatedUser): Promise<LicenseEntity> {
    const license = await this.findOne(id);
    if (license.status === LicenseStatus.REVOKED) {
      throw new BadRequestException('Revoked license cannot be activated');
    }
    if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Expired license cannot be activated');
    }

    if (!license.validFrom) license.validFrom = new Date();
    license.status = LicenseStatus.ACTIVE;
    license.updatedBy = actor.id;
    this.invalidateSignedCertificate(license);
    await this.licenseRepository.save(license);
    await this.writeAudit(id, actor.id, 'license.activated');
    const activated = await this.findOne(id);
    await this.commercialNotifications?.notifyCompanyAdmins(activated, 'license.activated');
    return activated;
  }

  async suspend(id: string, actor: AuthenticatedUser): Promise<LicenseEntity> {
    const license = await this.findOne(id);
    if (license.status === LicenseStatus.REVOKED) {
      throw new BadRequestException('Revoked license cannot be suspended');
    }
    license.status = LicenseStatus.SUSPENDED;
    license.updatedBy = actor.id;
    this.invalidateSignedCertificate(license);
    await this.licenseRepository.save(license);
    await this.writeAudit(id, actor.id, 'license.suspended');
    const suspended = await this.findOne(id);
    await this.commercialNotifications?.notifyCompanyAdmins(suspended, 'license.suspended');
    return suspended;
  }

  async revoke(id: string, actor: AuthenticatedUser): Promise<LicenseEntity> {
    const license = await this.findOne(id);
    license.status = LicenseStatus.REVOKED;
    license.updatedBy = actor.id;
    this.invalidateSignedCertificate(license);
    await this.licenseRepository.save(license);

    await this.activationRepository.update(
      { licenseId: id, status: LicenseActivationStatus.ACTIVE },
      {
        status: LicenseActivationStatus.REVOKED,
        revokedAt: new Date(),
      },
    );
    await this.writeAudit(id, actor.id, 'license.revoked');
    const revoked = await this.findOne(id);
    await this.commercialNotifications?.notifyCompanyAdmins(revoked, 'license.revoked');
    return revoked;
  }

  async replaceFeatures(
    id: string,
    dto: ReplaceLicenseFeaturesDto,
    actor: AuthenticatedUser,
  ): Promise<LicenseEntity> {
    await this.findOne(id);
    await this.dataSource.transaction(async (manager) => {
      await this.replaceFeaturesWithManager(manager, id, dto.features);
      await manager.getRepository(LicenseEntity).update(
        { id },
        {
          certificatePayload: null,
          certificateSignature: null,
          certificatePayloadHash: null,
          certificateKeyId: null,
          certificateIssuedAt: null,
        },
      );
      await this.writeAuditWithManager(
        manager,
        id,
        actor.id,
        'license.features_replaced',
        {
          features: dto.features.map((item) => ({
            feature: item.feature,
            enabled: item.enabled ?? true,
            featureLimit: item.featureLimit ?? null,
          })),
        },
      );
    });
    return this.findOne(id);
  }

  async createActivation(
    id: string,
    dto: CreateLicenseActivationDto,
    actor: AuthenticatedUser,
  ): Promise<LicenseActivationEntity> {
    const license = await this.findOne(id);
    this.assertLicenseUsable(license);
    this.assertVersionInRange(license, dto.appVersion);

    const existing = await this.activationRepository.findOne({
      where: { licenseId: id, installationId: dto.installationId },
    });

    if (existing) {
      existing.fingerprintHash = dto.fingerprintHash;
      existing.appVersion = dto.appVersion;
      existing.status = LicenseActivationStatus.ACTIVE;
      existing.revokedAt = null;
      existing.lastSeenAt = new Date();
      existing.activationTokenHash = null;
      const saved = await this.activationRepository.save(existing);
      await this.writeAudit(id, actor.id, 'activation.refreshed', {
        activationId: saved.id,
        installationId: saved.installationId,
        appVersion: saved.appVersion,
      });
      await this.commercialNotifications?.notifyCompanyAdmins(license, 'activation.authorized', {
        activationId: saved.id, installationId: saved.installationId, appVersion: saved.appVersion, refreshed: true,
      });
      return saved;
    }

    const activation = this.activationRepository.create({
      licenseId: id,
      installationId: dto.installationId,
      fingerprintHash: dto.fingerprintHash,
      appVersion: dto.appVersion,
      status: LicenseActivationStatus.ACTIVE,
      activatedAt: new Date(),
      lastSeenAt: new Date(),
      revokedAt: null,
    });
    const saved = await this.activationRepository.save(activation);
    await this.writeAudit(id, actor.id, 'activation.created', {
      activationId: saved.id,
      installationId: saved.installationId,
      appVersion: saved.appVersion,
    });
    await this.commercialNotifications?.notifyCompanyAdmins(license, 'activation.authorized', {
      activationId: saved.id, installationId: saved.installationId, appVersion: saved.appVersion, refreshed: false,
    });
    return saved;
  }

  async revokeActivation(
    licenseId: string,
    activationId: string,
    actor: AuthenticatedUser,
  ): Promise<LicenseActivationEntity> {
    await this.findOne(licenseId);
    const activation = await this.activationRepository.findOne({
      where: { id: activationId, licenseId },
    });
    if (!activation)
      throw new NotFoundException('License activation not found');

    activation.status = LicenseActivationStatus.REVOKED;
    activation.revokedAt = new Date();
    activation.activationTokenHash = null;
    const saved = await this.activationRepository.save(activation);
    await this.writeAudit(licenseId, actor.id, 'activation.revoked', {
      activationId,
      installationId: activation.installationId,
    });
    const license = await this.findOne(licenseId);
    await this.commercialNotifications?.notifyCompanyAdmins(license, 'activation.revoked', {
      activationId, installationId: activation.installationId,
    });
    return saved;
  }

  async issueSignedCertificate(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<SignedLicenseCertificate> {
    const signingService = this.requireSigningService();
    const license = await this.findOne(id);
    this.assertLicenseUsableWithoutSignature(license);

    const payload = this.buildCertificatePayload(license);
    const certificate = signingService.signPayload(payload);

    license.certificatePayload = payload as unknown as Record<string, unknown>;
    license.certificateSignature = certificate.signature;
    license.certificatePayloadHash = certificate.payloadHash;
    license.certificateKeyId = certificate.keyId;
    license.certificateIssuedAt = new Date(payload.issuedAt);
    license.updatedBy = actor.id;
    await this.licenseRepository.save(license);

    await this.writeAudit(id, actor.id, 'license.certificate_issued', {
      keyId: certificate.keyId,
      payloadHash: certificate.payloadHash,
      issuedAt: payload.issuedAt,
    });

    return certificate;
  }

  async getSignedCertificateForCompany(
    companyId: string,
  ): Promise<SignedLicenseCertificate> {
    const license = await this.licenseRepository.findOne({
      where: { companyId, deletedAt: IsNull() },
      relations: { company: true, features: true },
    });
    if (!license) {
      throw new ForbiddenException('Company does not have a license');
    }
    this.assertLicenseUsable(license);
    return this.getVerifiedStoredCertificate(license);
  }

  async issueActivationCredential(
    licenseId: string,
    activationId: string,
    actor: AuthenticatedUser,
  ): Promise<{
    activationId: string;
    activationToken: string;
    issuedAt: string;
  }> {
    const license = await this.findOne(licenseId);
    this.assertLicenseUsable(license);

    const activation = await this.activationRepository.findOne({
      where: {
        id: activationId,
        licenseId,
        status: LicenseActivationStatus.ACTIVE,
      },
    });
    if (!activation) {
      throw new NotFoundException('Active license activation not found');
    }

    const activationToken = randomBytes(32).toString('base64url');
    activation.activationTokenHash = this.hashActivationToken(activationToken);
    await this.activationRepository.save(activation);

    const issuedAt = new Date().toISOString();
    await this.writeAudit(licenseId, actor.id, 'activation.credential_issued', {
      activationId,
      installationId: activation.installationId,
      issuedAt,
    });

    return { activationId, activationToken, issuedAt };
  }

  async heartbeat(
    dto: LicenseHeartbeatDto,
    request: { ipAddress: string; userAgent: string | null },
  ): Promise<{
    authorized: true;
    licenseId: string;
    companyId: string;
    activationId: string;
    heartbeatAt: string;
    nextHeartbeatSeconds: number;
    expiresAt: Date | null;
    certificateKeyId: string | null;
  }> {
    const activation = await this.activationRepository.findOne({
      where: { id: dto.activationId },
      relations: { license: { company: true, features: true } },
    });
    if (!activation || activation.status !== LicenseActivationStatus.ACTIVE) {
      throw new ForbiddenException('Installation activation is not authorized');
    }

    if (!activation.activationTokenHash) {
      throw new ForbiddenException(
        'Installation credential has not been issued',
      );
    }

    this.assertActivationToken(
      dto.activationToken,
      activation.activationTokenHash,
    );

    if (activation.installationId !== dto.installationId) {
      throw new ForbiddenException('Installation identity does not match');
    }
    if (activation.fingerprintHash !== dto.fingerprintHash) {
      throw new ForbiddenException('Installation fingerprint does not match');
    }

    const license = activation.license;
    this.assertLicenseUsable(license);
    this.assertAuthorizedVersionForLicense(license, dto.appVersion);

    activation.appVersion = dto.appVersion;
    activation.lastSeenAt = new Date();
    activation.lastIpAddress = request.ipAddress || null;
    activation.lastUserAgent = request.userAgent?.slice(0, 255) ?? null;
    await this.activationRepository.save(activation);

    return {
      authorized: true,
      licenseId: license.id,
      companyId: license.companyId,
      activationId: activation.id,
      heartbeatAt: activation.lastSeenAt.toISOString(),
      nextHeartbeatSeconds: 900,
      expiresAt: license.expiresAt,
      certificateKeyId: license.certificateKeyId,
    };
  }

  async getCompanyEntitlement(companyId: string): Promise<LicenseEntitlement> {
    const license = await this.licenseRepository.findOne({
      where: { companyId, deletedAt: IsNull() },
      relations: { company: true, features: true },
    });
    if (!license) {
      throw new ForbiddenException('Company does not have a license');
    }
    this.assertLicenseUsable(license);

    if (this.licenseSigningService?.requiresSignedLicenses()) {
      const certificate = this.getVerifiedStoredCertificate(license);
      const payload = certificate.payload;
      return {
        licenseId: payload.licenseId,
        licenseNumber: payload.licenseNumber,
        companyId: payload.companyId,
        plan: payload.plan,
        status: payload.status,
        maxUsers: payload.maxUsers,
        maxConcurrentUsers: payload.maxConcurrentUsers,
        validFrom: payload.validFrom ? new Date(payload.validFrom) : null,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        minimumVersion: payload.minimumVersion,
        maximumVersion: payload.maximumVersion,
        features: payload.features,
      };
    }

    return {
      licenseId: license.id,
      licenseNumber: license.licenseNumber,
      companyId: license.companyId,
      plan: license.plan,
      status: this.effectiveStatus(license),
      maxUsers: license.maxUsers,
      maxConcurrentUsers: license.maxConcurrentUsers,
      validFrom: license.validFrom,
      expiresAt: license.expiresAt,
      minimumVersion: license.minimumVersion,
      maximumVersion: license.maximumVersion,
      features: (license.features ?? []).map((feature) => ({
        feature: feature.feature,
        enabled: feature.enabled,
        featureLimit: feature.featureLimit,
        config: feature.config,
      })),
    };
  }

  async assertFeatureEnabled(
    companyId: string,
    feature: LicensedFeature,
  ): Promise<void> {
    const entitlement = await this.getCompanyEntitlement(companyId);
    const enabled = entitlement.features.some(
      (item) => item.feature === feature && item.enabled,
    );
    if (!enabled) {
      throw new ForbiddenException(
        `Feature '${feature}' is not enabled for this company`,
      );
    }
  }

  async assertVersionAuthorized(
    companyId: string,
    version: string,
  ): Promise<void> {
    const license = await this.licenseRepository.findOne({
      where: { companyId, deletedAt: IsNull() },
      relations: { company: true },
    });
    if (!license)
      throw new ForbiddenException('Company does not have a license');
    this.assertLicenseUsable(license);
    this.assertAuthorizedVersionForLicense(license, version);
  }

  async assertUserCapacity(
    companyId: string,
    additionalUsers = 1,
  ): Promise<void> {
    const license = await this.licenseRepository.findOne({
      where: { companyId, deletedAt: IsNull() },
      relations: { company: true },
    });
    if (!license)
      throw new ForbiddenException('Company does not have a license');
    this.assertLicenseUsable(license);
    const maxUsers = this.licenseSigningService?.requiresSignedLicenses()
      ? this.getVerifiedStoredCertificate(license).payload.maxUsers
      : license.maxUsers;

    const activeUsers = await this.userRepository.count({
      where: {
        companyId,
        status: UserStatus.ACTIVE,
        deletedAt: IsNull(),
      },
    });
    if (activeUsers + additionalUsers > maxUsers) {
      throw new ForbiddenException(
        `License user limit reached (${activeUsers}/${maxUsers})`,
      );
    }
  }

  async usage(id: string): Promise<{
    licenseId: string;
    companyId: string;
    activeUsers: number;
    maxUsers: number;
    remainingUsers: number;
    userUtilizationPercent: number;
    activeActivations: number;
    maxConcurrentUsers: number | null;
  }> {
    const license = await this.findOne(id);
    const [activeUsers, activeActivations] = await Promise.all([
      this.userRepository.count({
        where: {
          companyId: license.companyId,
          status: UserStatus.ACTIVE,
          deletedAt: IsNull(),
        },
      }),
      this.activationRepository.count({
        where: {
          licenseId: license.id,
          status: LicenseActivationStatus.ACTIVE,
        },
      }),
    ]);

    const signedPayload = this.licenseSigningService?.requiresSignedLicenses()
      ? this.getVerifiedStoredCertificate(license).payload
      : null;
    const maxUsers = signedPayload?.maxUsers ?? license.maxUsers;
    const maxConcurrentUsers =
      signedPayload?.maxConcurrentUsers ?? license.maxConcurrentUsers;

    return {
      licenseId: license.id,
      companyId: license.companyId,
      activeUsers,
      maxUsers,
      remainingUsers: Math.max(0, maxUsers - activeUsers),
      userUtilizationPercent:
        maxUsers > 0 ? Number(((activeUsers / maxUsers) * 100).toFixed(2)) : 0,
      activeActivations,
      maxConcurrentUsers,
    };
  }

  planTemplates() {
    return getLicensePlanTemplates();
  }

  async dashboard(): Promise<{
    total: number;
    active: number;
    suspended: number;
    revoked: number;
    expiredByDate: number;
    expiringWithin7Days: number;
    expiringWithin30Days: number;
    licensedCompanies: number;
    expirationWarnings: Array<{
      id: string;
      licenseNumber: string;
      companyId: string;
      companyName: string;
      status: LicenseStatus;
      expiresAt: Date;
      daysRemaining: number;
    }>;
  }> {
    const warning7Cutoff = new Date(Date.now() + 7 * 86_400_000);
    const warning30Cutoff = new Date(Date.now() + 30 * 86_400_000);
    const [
      total,
      active,
      suspended,
      revoked,
      expiredByDate,
      expiringWithin7Days,
      expiringWithin30Days,
      warningLicenses,
    ] = await Promise.all([
      this.licenseRepository.count({ where: { deletedAt: IsNull() } }),
      this.licenseRepository.count({
        where: { status: LicenseStatus.ACTIVE, deletedAt: IsNull() },
      }),
      this.licenseRepository.count({
        where: { status: LicenseStatus.SUSPENDED, deletedAt: IsNull() },
      }),
      this.licenseRepository.count({
        where: { status: LicenseStatus.REVOKED, deletedAt: IsNull() },
      }),
      this.licenseRepository
        .createQueryBuilder('license')
        .where('license.deleted_at IS NULL')
        .andWhere('license.expires_at IS NOT NULL')
        .andWhere('license.expires_at <= NOW()')
        .getCount(),
      this.licenseRepository
        .createQueryBuilder('license')
        .where('license.deleted_at IS NULL')
        .andWhere('license.expires_at IS NOT NULL')
        .andWhere('license.expires_at > NOW()')
        .andWhere('license.expires_at <= :warning7Cutoff', { warning7Cutoff })
        .andWhere('license.status != :revokedStatus', {
          revokedStatus: LicenseStatus.REVOKED,
        })
        .getCount(),
      this.licenseRepository
        .createQueryBuilder('license')
        .where('license.deleted_at IS NULL')
        .andWhere('license.expires_at IS NOT NULL')
        .andWhere('license.expires_at > NOW()')
        .andWhere('license.expires_at <= :warning30Cutoff', { warning30Cutoff })
        .andWhere('license.status != :revokedStatus', {
          revokedStatus: LicenseStatus.REVOKED,
        })
        .getCount(),
      this.licenseRepository
        .createQueryBuilder('license')
        .leftJoinAndSelect('license.company', 'company')
        .where('license.deleted_at IS NULL')
        .andWhere('license.expires_at IS NOT NULL')
        .andWhere('license.expires_at > NOW()')
        .andWhere('license.expires_at <= :warning30Cutoff', { warning30Cutoff })
        .andWhere('license.status != :revokedStatus', {
          revokedStatus: LicenseStatus.REVOKED,
        })
        .orderBy('license.expiresAt', 'ASC')
        .take(25)
        .getMany(),
    ]);

    const now = Date.now();
    const expirationWarnings = warningLicenses.map((license) => ({
      id: license.id,
      licenseNumber: license.licenseNumber,
      companyId: license.companyId,
      companyName: license.company?.name ?? license.companyId,
      status: license.status,
      expiresAt: license.expiresAt as Date,
      daysRemaining: Math.max(
        0,
        Math.ceil(((license.expiresAt as Date).getTime() - now) / 86_400_000),
      ),
    }));

    return {
      total,
      active,
      suspended,
      revoked,
      expiredByDate,
      expiringWithin7Days,
      expiringWithin30Days,
      licensedCompanies: total,
      expirationWarnings,
    };
  }

  private async replaceFeaturesWithManager(
    manager: EntityManager,
    licenseId: string,
    features: Array<{
      feature: LicensedFeature;
      enabled?: boolean;
      featureLimit?: number | null;
      config?: Record<string, unknown> | null;
    }>,
  ): Promise<void> {
    const repo = manager.getRepository(LicenseFeatureEntity);
    await repo.delete({ licenseId });
    if (features.length === 0) return;

    await repo.save(
      features.map((item) =>
        repo.create({
          licenseId,
          feature: item.feature,
          enabled: item.enabled ?? true,
          featureLimit: item.featureLimit ?? null,
          config: item.config ?? null,
        }),
      ),
    );
  }

  private assertLicenseUsable(license: LicenseEntity): void {
    this.assertLicenseUsableWithoutSignature(license);

    if (this.licenseSigningService?.requiresSignedLicenses()) {
      const certificate = this.getVerifiedStoredCertificate(license);
      const payload = certificate.payload;
      const now = Date.now();

      if (payload.status !== LicenseStatus.ACTIVE) {
        throw new ForbiddenException(`Signed license is ${payload.status}`);
      }
      if (payload.validFrom && new Date(payload.validFrom).getTime() > now) {
        throw new ForbiddenException('Signed license is not valid yet');
      }
      if (payload.expiresAt && new Date(payload.expiresAt).getTime() <= now) {
        throw new ForbiddenException('Signed license is expired');
      }
    }
  }

  private assertLicenseUsableWithoutSignature(license: LicenseEntity): void {
    if (!license.company?.isActive) {
      throw new ForbiddenException('Company is not active');
    }
    const status = this.effectiveStatus(license);
    if (status !== LicenseStatus.ACTIVE) {
      throw new ForbiddenException(`License is ${status}`);
    }
    const now = Date.now();
    if (license.validFrom && license.validFrom.getTime() > now) {
      throw new ForbiddenException('License is not valid yet');
    }
  }

  private buildCertificatePayload(
    license: LicenseEntity,
  ): SignedLicenseCertificatePayload {
    return {
      schemaVersion: 1,
      licenseId: license.id,
      licenseNumber: license.licenseNumber,
      companyId: license.companyId,
      plan: license.plan,
      status: this.effectiveStatus(license),
      maxUsers: license.maxUsers,
      maxConcurrentUsers: license.maxConcurrentUsers,
      validFrom: license.validFrom?.toISOString() ?? null,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      minimumVersion: license.minimumVersion,
      maximumVersion: license.maximumVersion,
      features: [...(license.features ?? [])]
        .sort((left, right) => left.feature.localeCompare(right.feature))
        .map((feature) => ({
          feature: feature.feature,
          enabled: feature.enabled,
          featureLimit: feature.featureLimit,
          config: feature.config,
        })),
      issuedAt: new Date().toISOString(),
    };
  }

  private getVerifiedStoredCertificate(
    license: LicenseEntity,
  ): SignedLicenseCertificate {
    const signingService = this.requireSigningService();
    if (
      !license.certificatePayload ||
      !license.certificateSignature ||
      !license.certificatePayloadHash ||
      !license.certificateKeyId
    ) {
      throw new ForbiddenException(
        'License has not been cryptographically signed',
      );
    }

    const certificate: SignedLicenseCertificate = {
      payload:
        license.certificatePayload as unknown as SignedLicenseCertificatePayload,
      signature: license.certificateSignature,
      payloadHash: license.certificatePayloadHash,
      keyId: license.certificateKeyId,
    };

    if (
      certificate.payload.licenseId !== license.id ||
      certificate.payload.companyId !== license.companyId ||
      certificate.payload.licenseNumber !== license.licenseNumber
    ) {
      throw new ForbiddenException(
        'Signed license certificate does not match this license record',
      );
    }

    signingService.verifyCertificate(certificate);
    return certificate;
  }

  private assertAuthorizedVersionForLicense(
    license: LicenseEntity,
    version: string,
  ): void {
    if (this.licenseSigningService?.requiresSignedLicenses()) {
      const payload = this.getVerifiedStoredCertificate(license).payload;
      this.assertVersionBounds(
        version,
        payload.minimumVersion,
        payload.maximumVersion,
      );
      return;
    }
    this.assertVersionInRange(license, version);
  }

  private assertVersionBounds(
    version: string,
    minimumVersion: string | null,
    maximumVersion: string | null,
  ): void {
    if (minimumVersion && this.compareVersions(version, minimumVersion) < 0) {
      throw new ForbiddenException(
        `Version ${version} is below minimum authorized version ${minimumVersion}`,
      );
    }
    if (maximumVersion && this.compareVersions(version, maximumVersion) > 0) {
      throw new ForbiddenException(
        `Version ${version} is above maximum authorized version ${maximumVersion}`,
      );
    }
  }

  private invalidateSignedCertificate(license: LicenseEntity): void {
    license.certificatePayload = null;
    license.certificateSignature = null;
    license.certificatePayloadHash = null;
    license.certificateKeyId = null;
    license.certificateIssuedAt = null;
  }

  private requireSigningService(): LicenseSigningService {
    if (!this.licenseSigningService) {
      throw new ForbiddenException('License signing service is unavailable');
    }
    return this.licenseSigningService;
  }

  private hashActivationToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private assertActivationToken(token: string, expectedHash: string): void {
    const actual = Buffer.from(this.hashActivationToken(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new ForbiddenException('Installation credential is invalid');
    }
  }

  private effectiveStatus(license: LicenseEntity): LicenseStatus {
    if (
      license.status === LicenseStatus.ACTIVE &&
      license.expiresAt &&
      license.expiresAt.getTime() <= Date.now()
    ) {
      return LicenseStatus.EXPIRED;
    }
    return license.status;
  }

  private assertVersionInRange(license: LicenseEntity, version: string): void {
    this.assertVersionBounds(
      version,
      license.minimumVersion,
      license.maximumVersion,
    );
  }

  private async assertCompanyExists(companyId: string): Promise<void> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId, deletedAt: IsNull() },
    });
    if (!company) throw new NotFoundException('Company not found');
  }

  private async assertMaxUsersNotBelowCurrentUsage(
    companyId: string,
    maxUsers: number,
  ): Promise<void> {
    const activeUsers = await this.userRepository.count({
      where: {
        companyId,
        status: UserStatus.ACTIVE,
        deletedAt: IsNull(),
      },
    });

    if (activeUsers > maxUsers) {
      throw new BadRequestException(
        `maxUsers cannot be below current active user count (${activeUsers})`,
      );
    }
  }

  private validateLimits(
    maxUsers: number,
    maxConcurrentUsers: number | null,
  ): void {
    if (maxUsers < 1)
      throw new BadRequestException('maxUsers must be at least 1');
    if (maxConcurrentUsers !== null) {
      if (maxConcurrentUsers < 1) {
        throw new BadRequestException('maxConcurrentUsers must be at least 1');
      }
      if (maxConcurrentUsers > maxUsers) {
        throw new BadRequestException(
          'maxConcurrentUsers cannot exceed maxUsers',
        );
      }
    }
  }

  private validateDates(
    validFrom: string | null,
    expiresAt: string | null,
  ): void {
    this.validateDateObjects(
      validFrom ? new Date(validFrom) : null,
      expiresAt ? new Date(expiresAt) : null,
    );
  }

  private validateDateObjects(
    validFrom: Date | null,
    expiresAt: Date | null,
  ): void {
    if (validFrom && expiresAt && expiresAt.getTime() <= validFrom.getTime()) {
      throw new BadRequestException('expiresAt must be after validFrom');
    }
  }

  private validateVersionRange(
    minimumVersion: string | null,
    maximumVersion: string | null,
  ): void {
    if (
      minimumVersion &&
      maximumVersion &&
      this.compareVersions(minimumVersion, maximumVersion) > 0
    ) {
      throw new BadRequestException(
        'minimumVersion cannot be greater than maximumVersion',
      );
    }
  }

  private compareVersions(left: string, right: string): number {
    const parse = (value: string): number[] =>
      value
        .split('-', 1)[0]
        .split('.')
        .map((part) => Number(part));
    const a = parse(left);
    const b = parse(right);
    const length = Math.max(a.length, b.length, 3);
    for (let i = 0; i < length; i += 1) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }

  private generateLicenseNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TS-${date}-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private async writeAudit(
    licenseId: string,
    actorUserId: string | null,
    action: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.auditRepository.save(
      this.auditRepository.create({
        licenseId,
        actorUserId,
        action,
        metadata,
        ipAddress: null,
      }),
    );
  }

  private async writeAuditWithManager(
    manager: EntityManager,
    licenseId: string,
    actorUserId: string | null,
    action: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    const repo = manager.getRepository(LicenseAuditLogEntity);
    await repo.save(
      repo.create({
        licenseId,
        actorUserId,
        action,
        metadata,
        ipAddress: null,
      }),
    );
  }
}
