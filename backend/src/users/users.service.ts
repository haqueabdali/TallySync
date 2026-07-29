import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
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
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

const BCRYPT_ROUNDS = 12;
const SENSITIVE_FIELDS = new Set(['passwordHash', 'resetTokenHash']);

type ActorContext = AuditContext | AuthenticatedUser;

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

  async createUser(
    dto: CreateUserDto,
    actor: ActorContext,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    await this.assertEmailUnique(dto.email);
    const role = await this.assertRoleExists(dto.roleId);
    const authActor = this.asAuthenticatedUser(actor);

    if (authActor && authActor.role !== 'admin') {
      if (dto.companyId !== authActor.companyId) {
        throw new BadRequestException(
          'You cannot create a user for another company',
        );
      }
      if (role.name === 'admin') {
        throw new BadRequestException('Only admins can assign the admin role');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      companyId: dto.companyId,
      roleId: dto.roleId,
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      passwordHash,
      phone: dto.phone ?? null,
      status: dto.status ?? UserStatus.ACTIVE,
    });

    const saved = await this.userRepository.save(user);
    const withRole = (await this.tryReload(saved?.id)) ?? { ...saved, role };

    await this.writeAudit(
      actor,
      AuditAction.CREATE,
      saved?.id ?? withRole.id,
      null,
      this.sanitize(withRole),
      ipAddress,
    );

    return this.toResponse(withRole);
  }

  async listUsers(
    query: Partial<ListUsersQueryDto>,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedUsersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const createQb = (this.userRepository as any).createQueryBuilder;
    if (actor && typeof createQb === 'function') {
      const qb = createQb.call(this.userRepository, 'user');
      qb.leftJoinAndSelect('user.role', 'role').where(
        'user.deleted_at IS NULL',
      );

      if (actor.role !== 'admin') {
        qb.andWhere('user.company_id = :companyId', {
          companyId: actor.companyId,
        });
      } else if (query.companyId) {
        qb.andWhere('user.company_id = :companyId', {
          companyId: query.companyId,
        });
      }
      if (query.roleId)
        qb.andWhere('user.role_id = :roleId', { roleId: query.roleId });
      if (query.status)
        qb.andWhere('user.status = :status', { status: query.status });
      if (query.search) {
        qb.andWhere(
          '(user.full_name ILIKE :search OR user.email ILIKE :search)',
          {
            search: `%${query.search}%`,
          },
        );
      }

      qb.orderBy(`user.${this.toSnakeColumn(sortBy)}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);
      const [users, total] = await qb.getManyAndCount();
      return this.paginate(users, total, page, limit);
    }

    const baseFilter: Record<string, unknown> = {
      deletedAt: IsNull(),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.roleId && { roleId: query.roleId }),
      ...(query.status && { status: query.status }),
    };
    const where = query.search
      ? [
          { ...baseFilter, fullName: ILike(`%${query.search}%`) },
          { ...baseFilter, email: ILike(`%${query.search}%`) },
        ]
      : [baseFilter];
    const [users, total] = await this.userRepository.findAndCount({
      where: where,
      relations: ['role'],
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.paginate(users, total, page, limit);
  }

  async listRoles(): Promise<RoleEntity[]> {
    return this.roleRepository.find({ order: { name: 'ASC' } } as any);
  }

  async getUser(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    if (actor.role !== 'admin' && user.companyId !== actor.companyId) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }
    return this.toResponse(user);
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    return this.toResponse(await this.findEntityById(id));
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    actor: ActorContext,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const authActor = this.asAuthenticatedUser(actor);

    if (authActor && authActor.role !== 'admin') {
      if (user.companyId !== authActor.companyId) {
        throw new NotFoundException(`User with id '${id}' not found`);
      }
      if (dto.status !== undefined) {
        throw new BadRequestException('Only admins can change user status');
      }
    }

    const oldValues = this.sanitize(user);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.status !== undefined) user.status = dto.status;

    const updated = await this.userRepository.save(user);
    await this.writeAudit(
      actor,
      AuditAction.UPDATE,
      id,
      oldValues,
      this.sanitize(updated),
      ipAddress,
    );
    return this.toResponse(updated);
  }

  async deleteUser(
    id: string,
    actor: ActorContext,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const user = await this.findEntityById(id);
    const authActor = this.asAuthenticatedUser(actor);
    const actorId = this.actorId(actor);

    if (id === actorId) {
      if (authActor)
        throw new BadRequestException('You cannot delete your own account');
      throw new ForbiddenException('You cannot delete your own account');
    }
    if (
      authActor &&
      authActor.role !== 'admin' &&
      user.role?.name === 'admin'
    ) {
      throw new BadRequestException('Only admins can delete admin users');
    }
    if (user.role?.isSystem && user.role.name === 'admin') {
      const count = await this.userRepository.count({
        where: {
          roleId: user.roleId,
          status: UserStatus.ACTIVE,
          deletedAt: IsNull(),
        },
      });
      if (count <= 1)
        throw new ForbiddenException(
          'Cannot delete the last active admin user',
        );
    }

    await this.userRepository.softDelete(id);
    await this.writeAudit(
      actor,
      AuditAction.DELETE,
      id,
      this.sanitize(user),
      null,
      ipAddress,
    );
    return { message: 'User deleted successfully' };
  }

  async assignRole(
    id: string,
    dto: AssignRoleDto,
    actor: ActorContext,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const role = await this.assertRoleExists(dto.roleId);
    const authActor = this.asAuthenticatedUser(actor);

    if (authActor && authActor.role !== 'admin') {
      if (user.companyId !== authActor.companyId) {
        throw new NotFoundException(`User with id '${id}' not found`);
      }
      if (role.name === 'admin' || user.role?.name === 'admin') {
        throw new BadRequestException('Only admins can change the admin role');
      }
    }

    if (user.roleId === dto.roleId) return this.toResponse(user);

    const oldRoleId = user.roleId;
    user.roleId = dto.roleId;
    user.role = role;
    const updated = await this.userRepository.save(user);
    const withRole = (await this.tryReload(id)) ?? updated;

    await this.writeAudit(
      actor,
      AuditAction.ASSIGN_ROLE,
      id,
      { roleId: oldRoleId },
      { roleId: dto.roleId, roleName: role.name },
      ipAddress,
    );
    return this.toResponse(withRole);
  }

  async assignCompany(
    id: string,
    dto: AssignCompanyDto,
    actor: ActorContext,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const oldCompanyId = user.companyId;
    user.companyId = dto.companyId;
    const updated = await this.userRepository.save(user);
    await this.writeAudit(
      actor,
      AuditAction.ASSIGN_COMPANY,
      id,
      { companyId: oldCompanyId },
      { companyId: dto.companyId },
      ipAddress,
    );
    return this.toResponse(updated);
  }

  async getUserActivity(
    id: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedActivityResponseDto> {
    await this.findEntityById(id);
    const [logs, total] = await this.auditRepository.findAndCount({
      where: { entityType: 'user', entityId: id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data: ActivityLogResponseDto[] = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    }));
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findEntityById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`User with id '${id}' not found`);
    return user;
  }

  private async tryReload(id?: string): Promise<UserEntity | null> {
    if (!id) return null;
    return this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['role'],
    });
  }

  private async assertEmailUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: {
        email: email.toLowerCase(),
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }
  }

  private async assertRoleExists(roleId: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role)
      throw new NotFoundException(`Role with id '${roleId}' not found`);
    return role;
  }

  private asAuthenticatedUser(actor: ActorContext): AuthenticatedUser | null {
    return 'role' in actor && 'id' in actor ? actor : null;
  }

  private actorId(actor: ActorContext): string {
    return 'id' in actor ? actor.id : actor.actorId;
  }

  private auditContext(actor: ActorContext, ipAddress?: string): AuditContext {
    if ('actorId' in actor)
      return { ...actor, ipAddress: ipAddress ?? actor.ipAddress };
    return {
      actorId: actor.id,
      companyId: actor.companyId,
      ipAddress,
      userAgent: undefined,
    };
  }

  private sanitize(user: UserEntity): Record<string, unknown> {
    const raw = { ...user } as Record<string, unknown>;
    for (const field of SENSITIVE_FIELDS) delete raw[field];
    return raw;
  }

  private toResponse(user: UserEntity): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  private paginate(
    users: UserEntity[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedUsersResponseDto {
    return {
      data: users.map((user) => this.toResponse(user)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private toSnakeColumn(field: string): string {
    return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private async writeAudit(
    actor: ActorContext,
    action: AuditAction,
    entityId: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    ipAddress?: string,
  ): Promise<void> {
    const audit = this.auditContext(actor, ipAddress);
    const entry = {
      companyId: audit.companyId,
      userId: audit.actorId,
      action,
      entityType: 'user',
      entityId,
      oldValues,
      newValues,
      ipAddress: audit.ipAddress ?? null,
      userAgent: audit.userAgent ?? null,
    } as AuditLogEntity;
    await this.auditRepository.save(entry);
  }
}
