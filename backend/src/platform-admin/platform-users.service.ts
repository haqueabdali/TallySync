import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Not, Repository } from 'typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { AssignRoleDto } from '../users/dto/assign-role.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import type { AuthenticatedUser } from '../users/interfaces/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import { ListPlatformUsersQueryDto } from './dto/list-platform-users-query.dto';

export interface PlatformCustomerUserSummary {
  id: string;
  companyId: string;
  companyName: string;
  roleId: string;
  roleName: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PlatformUsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly usersService: UsersService,
  ) {}

  async list(query: ListPlatformUsersQueryDto): Promise<{
    data: PlatformCustomerUserSummary[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role')
      .innerJoinAndSelect('user.company', 'company')
      .where('user.deleted_at IS NULL')
      .andWhere('user.company_id IS NOT NULL')
      .andWhere('company.deleted_at IS NULL');

    if (query.companyId) {
      qb.andWhere('user.company_id = :companyId', { companyId: query.companyId });
    }
    if (query.roleId) qb.andWhere('user.role_id = :roleId', { roleId: query.roleId });
    if (query.status) qb.andWhere('user.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('user.full_name ILIKE :search', { search: `%${query.search}%` })
            .orWhere('user.email ILIKE :search', { search: `%${query.search}%` })
            .orWhere('company.name ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }

    qb.orderBy(`user.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();
    return {
      data: users.map((user) => this.toSummary(user)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listRoles(): Promise<RoleEntity[]> {
    return this.usersService.listRoles();
  }

  async get(id: string): Promise<PlatformCustomerUserSummary> {
    return this.toSummary(await this.findCustomerUser(id));
  }

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
  ): Promise<PlatformCustomerUserSummary> {
    await this.assertCustomerCompany(dto.companyId);
    const created = await this.usersService.createUser(dto, actor, ipAddress);
    return this.get(created.id);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
  ): Promise<PlatformCustomerUserSummary> {
    await this.findCustomerUser(id);
    await this.usersService.updateUser(id, dto, actor, ipAddress);
    return this.get(id);
  }

  async assignRole(
    id: string,
    dto: AssignRoleDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
  ): Promise<PlatformCustomerUserSummary> {
    await this.findCustomerUser(id);
    await this.usersService.assignRole(id, dto, actor, ipAddress);
    return this.get(id);
  }

  async remove(
    id: string,
    actor: AuthenticatedUser,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    await this.findCustomerUser(id);
    return this.usersService.deleteUser(id, actor, ipAddress);
  }

  async activity(id: string, page = 1, limit = 20) {
    await this.findCustomerUser(id);
    return this.usersService.getUserActivity(id, page, limit);
  }

  private async findCustomerUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id, companyId: Not(IsNull()), deletedAt: IsNull() },
      relations: ['role', 'company'],
    });
    if (!user || !user.companyId || !user.company) {
      throw new NotFoundException('Customer user not found');
    }
    return user;
  }

  private async assertCustomerCompany(companyId: string): Promise<void> {
    const exists = await this.companyRepository.exists({
      where: { id: companyId, deletedAt: IsNull() },
    });
    if (!exists) throw new NotFoundException('Company not found');
  }

  private toSummary(user: UserEntity): PlatformCustomerUserSummary {
    if (!user.companyId || !user.company) {
      throw new NotFoundException('Customer user not found');
    }
    return {
      id: user.id,
      companyId: user.companyId,
      companyName: user.company.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
