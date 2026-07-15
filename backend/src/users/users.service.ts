import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import {
  UserEntity,
  UserStatus,
} from '../auth/entities/user.entity';

import { RoleEntity } from '../auth/entities/role.entity';

import { CompanyEntity } from '../auth/entities/company.entity';
import { AuditLogEntity, AuditAction } from './entities/audit-log.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignCompanyDto } from './dto/assign-company.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import {
  UserResponseDto,
  PaginatedUsersResponseDto,
  ActivityLogResponseDto,
  PaginatedActivityResponseDto,
} from './dto/user-response.dto';

import { AuditContext } from './interfaces/audit-context.interface';
import { PaginatedResult } from './interfaces/paginated-result.interface';

const BCRYPT_ROUNDS = 12;

// Columns that may never appear in audit oldValues / newValues
const SENSITIVE_FIELDS = new Set(['passwordHash', 'resetTokenHash']);

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,

    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  // ── CREATE USER ────────────────────────────────────────────────────────────

  async createUser(
    dto: CreateUserDto,
    audit: AuditContext,
  ): Promise<UserResponseDto> {
    await this.assertEmailUnique(dto.email);
    await this.assertRoleExists(dto.roleId);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepository.create({
      companyId: dto.companyId,
      roleId:    dto.roleId,
      fullName:  dto.fullName,
      email:     dto.email.toLowerCase(),
      passwordHash,
      phone:     dto.phone   ?? null,
      status:    dto.status  ?? UserStatus.ACTIVE,
    });

    const saved = await this.userRepository.save(user);

    // Reload with role relation so the response DTO is complete
    const withRole = await this.findEntityById(saved.id);

    await this.writeAudit({
      audit,
      action:     AuditAction.CREATE,
      entityType: 'user',
      entityId:   saved.id,
      oldValues:  null,
      newValues:  this.sanitize(withRole),
    });

    this.logger.log(
      `User created: ${saved.id} by actor ${audit.actorId}`,
    );

    return this.toResponse(withRole);
  }

  // ── LIST USERS (paginated) ─────────────────────────────────────────────────

  async listUsers(
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    const {
      search,
      companyId,
      roleId,
      status,
      page  = 1,
      limit = 20,
      sortBy    = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<UserEntity>[] = [];

    const baseFilter: FindOptionsWhere<UserEntity> = {
      deletedAt: IsNull(),
      ...(companyId && { companyId }),
      ...(roleId    && { roleId }),
      ...(status    && { status }),
    };

    if (search) {
      where.push(
        { ...baseFilter, fullName: ILike(`%${search}%`) },
        { ...baseFilter, email:    ILike(`%${search}%`) },
      );
    } else {
      where.push(baseFilter);
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      relations: ['role'],
      order:     { [sortBy]: sortOrder },
      skip:      (page - 1) * limit,
      take:      limit,
    });

    return {
      data: users.map((u) => this.toResponse(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── GET ONE USER ───────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    return this.toResponse(user);
  }

  // ── UPDATE USER ────────────────────────────────────────────────────────────

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    audit: AuditContext,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const oldSnapshot = this.sanitize(user);

    // Apply only the provided fields
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone    !== undefined) user.phone    = dto.phone;
    if (dto.status   !== undefined) user.status   = dto.status;

    const updated = await this.userRepository.save(user);

    await this.writeAudit({
      audit,
      action:     AuditAction.UPDATE,
      entityType: 'user',
      entityId:   id,
      oldValues:  oldSnapshot,
      newValues:  this.sanitize(updated),
    });

    this.logger.log(`User updated: ${id} by actor ${audit.actorId}`);

    return this.toResponse(updated);
  }

  // ── SOFT DELETE USER ───────────────────────────────────────────────────────

  async deleteUser(id: string, audit: AuditContext): Promise<void> {
    const user = await this.findEntityById(id);

    // Prevent admins from deleting themselves
    if (id === audit.actorId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Prevent deletion of system role holders (extra safety net)
    if (user.role?.isSystem && user.role.name === 'admin') {
      const adminCount = await this.userRepository.count({
        where: {
          roleId:    user.roleId,
          status:    UserStatus.ACTIVE,
          deletedAt: IsNull(),
        },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot delete the last active admin user',
        );
      }
    }

    await this.userRepository.softDelete(id);

    await this.writeAudit({
      audit,
      action:     AuditAction.DELETE,
      entityType: 'user',
      entityId:   id,
      oldValues:  this.sanitize(user),
      newValues:  null,
    });

    this.logger.log(`User soft-deleted: ${id} by actor ${audit.actorId}`);
  }

  // ── ASSIGN ROLE ────────────────────────────────────────────────────────────

  async assignRole(
    id: string,
    dto: AssignRoleDto,
    audit: AuditContext,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const role = await this.assertRoleExists(dto.roleId);

    const oldRoleId = user.roleId;
    user.roleId = dto.roleId;
    user.role   = role;

    const updated = await this.userRepository.save(user);

    await this.writeAudit({
      audit,
      action:     AuditAction.ASSIGN_ROLE,
      entityType: 'user',
      entityId:   id,
      oldValues:  { roleId: oldRoleId },
      newValues:  { roleId: dto.roleId, roleName: role.name },
    });

    this.logger.log(
      `Role ${role.name} assigned to user ${id} by actor ${audit.actorId}`,
    );

    return this.toResponse(updated);
  }

  // ── ASSIGN COMPANY ─────────────────────────────────────────────────────────

  async assignCompany(
    id: string,
    dto: AssignCompanyDto,
    audit: AuditContext,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const oldCompanyId = user.companyId;

    user.companyId = dto.companyId;
    const updated = await this.userRepository.save(user);

    await this.writeAudit({
      audit,
      action:     AuditAction.ASSIGN_COMPANY,
      entityType: 'user',
      entityId:   id,
      oldValues:  { companyId: oldCompanyId },
      newValues:  { companyId: dto.companyId },
    });

    this.logger.log(
      `Company ${dto.companyId} assigned to user ${id} by actor ${audit.actorId}`,
    );

    return this.toResponse(updated);
  }

  // ── ACTIVITY LOG ───────────────────────────────────────────────────────────

  async getUserActivity(
    id: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedActivityResponseDto> {
    // Verify the user exists first
    await this.findEntityById(id);

    const [logs, total] = await this.auditRepository.findAndCount({
      where: { entityType: 'user', entityId: id },
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });

    const data: ActivityLogResponseDto[] = logs.map((log) => ({
      id:          log.id,
      action:      log.action,
      entityType:  log.entityType,
      entityId:    log.entityId,
      oldValues:   log.oldValues,
      newValues:   log.newValues,
      ipAddress:   log.ipAddress,
      createdAt:   log.createdAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

  private async findEntityById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where:     { id, deletedAt: IsNull() },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    return user;
  }

  private async assertEmailUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { email: email.toLowerCase(), deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException(
        `Email '${email}' is already registered`,
      );
    }
  }

  private async assertRoleExists(roleId: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException(`Role with id '${roleId}' not found`);
    }

    return role;
  }

  /** Strip sensitive fields before writing to audit logs */
  private sanitize(
    user: UserEntity,
  ): Record<string, unknown> {
    const raw = { ...user } as Record<string, unknown>;
    for (const field of SENSITIVE_FIELDS) {
      delete raw[field];
    }
    return raw;
  }

  private toResponse(user: UserEntity): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  private async writeAudit(params: {
    audit:      AuditContext;
    action:     AuditAction;
    entityType: string;
    entityId:   string;
    oldValues:  Record<string, unknown> | null;
    newValues:  Record<string, unknown> | null;
  }): Promise<void> {
    const { audit, action, entityType, entityId, oldValues, newValues } = params;

    await this.auditRepository.save(
      this.auditRepository.create({
        companyId:  audit.companyId,
        userId:     audit.actorId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress:  audit.ipAddress  ?? null,
        userAgent:  audit.userAgent  ?? null,
      }),
    );
  }
}
