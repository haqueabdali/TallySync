import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { LicenseEntity } from '../licensing/entities/license.entity';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { ListPlatformCompaniesQueryDto } from './dto/list-platform-companies-query.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';

export interface PlatformCompanySummary {
  id: string;
  name: string;
  tallyCompanyName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeUsers: number;
  license: null | {
    id: string;
    licenseNumber: string;
    plan: string;
    status: string;
    maxUsers: number;
    maxConcurrentUsers: number | null;
    expiresAt: Date | null;
    certificateIssuedAt: Date | null;
  };
}

@Injectable()
export class PlatformCompaniesService {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(LicenseEntity)
    private readonly licenseRepository: Repository<LicenseEntity>,
  ) {}

  async list(query: ListPlatformCompaniesQueryDto): Promise<{
    data: PlatformCompanySummary[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.companyRepository
      .createQueryBuilder('company')
      .where('company.deleted_at IS NULL');

    if (query.isActive !== undefined) {
      qb.andWhere('company.is_active = :isActive', {
        isActive: query.isActive,
      });
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('company.name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('company.tally_company_name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    qb.orderBy('company.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [companies, total] = await qb.getManyAndCount();
    const summaries = await this.attachCommercialSummary(companies);

    return {
      data: summaries,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<PlatformCompanySummary> {
    const company = await this.companyRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!company) throw new NotFoundException('Company not found');
    return (await this.attachCommercialSummary([company]))[0];
  }

  async create(dto: CreatePlatformCompanyDto): Promise<PlatformCompanySummary> {
    await this.assertNameAvailable(dto.name);

    const company = this.companyRepository.create({
      name: dto.name,
      tallyCompanyName: dto.tallyCompanyName?.trim() || dto.name,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.companyRepository.save(company);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdatePlatformCompanyDto,
  ): Promise<PlatformCompanySummary> {
    const company = await this.companyRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!company) throw new NotFoundException('Company not found');

    if (dto.name !== undefined && dto.name !== company.name) {
      await this.assertNameAvailable(dto.name, company.id);
      company.name = dto.name;
    }
    if (dto.tallyCompanyName !== undefined) {
      company.tallyCompanyName = dto.tallyCompanyName;
    }
    if (dto.isActive !== undefined) company.isActive = dto.isActive;

    await this.companyRepository.save(company);
    return this.findOne(company.id);
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.companyRepository
      .createQueryBuilder('company')
      .where('company.deleted_at IS NULL')
      .andWhere('LOWER(company.name) = LOWER(:name)', { name });
    if (excludeId) qb.andWhere('company.id <> :excludeId', { excludeId });

    if (await qb.getExists()) {
      throw new ConflictException('Company name already exists');
    }
  }

  private async attachCommercialSummary(
    companies: CompanyEntity[],
  ): Promise<PlatformCompanySummary[]> {
    if (companies.length === 0) return [];
    const companyIds = companies.map((company) => company.id);

    const [licenses, userRows] = await Promise.all([
      this.licenseRepository.find({
        where: { companyId: In(companyIds), deletedAt: IsNull() },
      }),
      this.userRepository
        .createQueryBuilder('user')
        .select('user.company_id', 'companyId')
        .addSelect('COUNT(*)', 'activeUsers')
        .where('user.company_id IN (:...companyIds)', { companyIds })
        .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
        .andWhere('user.deleted_at IS NULL')
        .groupBy('user.company_id')
        .getRawMany<{ companyId: string; activeUsers: string }>(),
    ]);

    const licenseByCompany = new Map(
      licenses.map((license) => [license.companyId, license]),
    );
    const usersByCompany = new Map(
      userRows.map((row) => [
        row.companyId,
        Number.parseInt(row.activeUsers, 10),
      ]),
    );

    return companies.map((company) => {
      const license = licenseByCompany.get(company.id);
      return {
        id: company.id,
        name: company.name,
        tallyCompanyName: company.tallyCompanyName,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        activeUsers: usersByCompany.get(company.id) ?? 0,
        license: license
          ? {
              id: license.id,
              licenseNumber: license.licenseNumber,
              plan: license.plan,
              status: license.status,
              maxUsers: license.maxUsers,
              maxConcurrentUsers: license.maxConcurrentUsers,
              expiresAt: license.expiresAt,
              certificateIssuedAt: license.certificateIssuedAt,
            }
          : null,
      };
    });
  }
}
