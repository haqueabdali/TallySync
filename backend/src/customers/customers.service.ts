import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';

import { CustomerEntity } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto/customer-response.dto';
import { CustomerRequestContext } from './interfaces/customer-request-context.interface';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async create(
    dto: CreateCustomerDto,
    context: CustomerRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);
    const name = this.normalizeRequiredText(dto.name, 'Customer name');
    const email = this.normalizeEmail(dto.email);

    await this.ensureEmailAvailable(companyId, email);

    const customer = this.customerRepository.create({
      companyId,
      name,
      email,
      phone: this.normalizeNullableText(dto.phone),
      address: this.normalizeNullableText(dto.address),
      tallyLedgerName:
        this.normalizeNullableText(dto.tallyLedgerName) ?? name,
      creditLimit: this.ensureNonNegativeNumber(
        dto.creditLimit ?? 0,
        'Credit limit',
      ),
      isActive: true,
    });

    try {
      const saved = await this.customerRepository.save(customer);
      this.logger.log(
        `Customer ${saved.id} created by ${context.actorId ?? 'unknown actor'}`,
      );
      return this.toResponse(saved);
    } catch (error: unknown) {
      this.throwMappedDatabaseError(error);
    }
  }

  async findAll(
    query: ListCustomersQueryDto,
    context: CustomerRequestContext,
  ): Promise<PaginatedCustomersResponseDto> {
    const companyId = this.requireCompanyId(context);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const builder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId })
      .andWhere('customer.deletedAt IS NULL');

    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(customer.name) LIKE LOWER(:search)', {
            search: `%${search}%`,
          })
            .orWhere("LOWER(COALESCE(customer.email, '')) LIKE LOWER(:search)")
            .orWhere("LOWER(COALESCE(customer.phone, '')) LIKE LOWER(:search)")
            .orWhere(
              "LOWER(COALESCE(customer.tallyLedgerName, '')) LIKE LOWER(:search)",
            );
        }),
      );
    }

    if (query.isActive !== undefined) {
      builder.andWhere('customer.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    const sortColumns: Record<string, string> = {
      name: 'customer.name',
      email: 'customer.email',
      creditLimit: 'customer.creditLimit',
      createdAt: 'customer.createdAt',
      updatedAt: 'customer.updatedAt',
    };

    const sortColumn = sortColumns[query.sortBy ?? 'name'] ?? 'customer.name';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const [customers, total] = await builder
      .orderBy(sortColumn, sortOrder, 'NULLS LAST')
      .addOrderBy('customer.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: customers.map((customer) => this.toResponse(customer)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    context: CustomerRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);
    const customer = await this.findEntity(id, companyId);
    return this.toResponse(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    context: CustomerRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);
    const customer = await this.findEntity(id, companyId);

    if (dto.name !== undefined) {
      customer.name = this.normalizeRequiredText(dto.name, 'Customer name');
    }

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      await this.ensureEmailAvailable(companyId, email, customer.id);
      customer.email = email;
    }

    if (dto.phone !== undefined) {
      customer.phone = this.normalizeNullableText(dto.phone);
    }

    if (dto.address !== undefined) {
      customer.address = this.normalizeNullableText(dto.address);
    }

    if (dto.tallyLedgerName !== undefined) {
      customer.tallyLedgerName = this.normalizeNullableText(
        dto.tallyLedgerName,
      );
    }

    if (dto.creditLimit !== undefined) {
      customer.creditLimit = this.ensureNonNegativeNumber(
        dto.creditLimit,
        'Credit limit',
      );
    }

    try {
      const saved = await this.customerRepository.save(customer);
      this.logger.log(
        `Customer ${saved.id} updated by ${context.actorId ?? 'unknown actor'}`,
      );
      return this.toResponse(saved);
    } catch (error: unknown) {
      this.throwMappedDatabaseError(error);
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateCustomerStatusDto,
    context: CustomerRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);
    const customer = await this.findEntity(id, companyId);
    customer.isActive = dto.isActive;
    const saved = await this.customerRepository.save(customer);
    return this.toResponse(saved);
  }

  async remove(id: string, context: CustomerRequestContext): Promise<void> {
    const companyId = this.requireCompanyId(context);
    const customer = await this.findEntity(id, companyId);
    await this.customerRepository.softRemove(customer);
    this.logger.log(
      `Customer ${customer.id} deleted by ${context.actorId ?? 'unknown actor'}`,
    );
  }

  async restore(
    id: string,
    context: CustomerRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);

    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .withDeleted()
      .where('customer.id = :id', { id })
      .andWhere('customer.companyId = :companyId', { companyId })
      .getOne();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.deletedAt) {
      return this.toResponse(customer);
    }

    await this.ensureEmailAvailable(companyId, customer.email, customer.id);
    await this.customerRepository.restore(customer.id);

    const restored = await this.customerRepository.findOne({
      where: { id: customer.id, companyId },
    });

    if (!restored) {
      throw new NotFoundException('Customer could not be restored');
    }

    return this.toResponse(restored);
  }

  private async findEntity(
    id: string,
    companyId: string,
  ): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { id, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  private async ensureEmailAvailable(
    companyId: string,
    email: string | null,
    excludedId?: string,
  ): Promise<void> {
    if (!email) {
      return;
    }

    const builder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId })
      .andWhere('LOWER(customer.email) = LOWER(:email)', { email })
      .andWhere('customer.deletedAt IS NULL');

    if (excludedId) {
      builder.andWhere('customer.id != :excludedId', { excludedId });
    }

    if (await builder.getExists()) {
      throw new ConflictException(
        'A customer with this email already exists in this company',
      );
    }
  }

  private requireCompanyId(context: CustomerRequestContext): string {
    const companyId = context.companyId?.trim();
    if (!companyId) {
      throw new BadRequestException('Authenticated company context is missing');
    }
    return companyId;
  }

  private normalizeRequiredText(value: string, field: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private normalizeNullableText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeEmail(value: string | null | undefined): string | null {
    return this.normalizeNullableText(value)?.toLowerCase() ?? null;
  }

  private ensureNonNegativeNumber(value: number, field: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }
    return parsed;
  }

  private toResponse(customer: CustomerEntity): CustomerResponseDto {
    return {
      id: customer.id,
      companyId: customer.companyId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      tallyLedgerName: customer.tallyLedgerName,
      creditLimit: Number(customer.creditLimit),
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      deletedAt: customer.deletedAt,
    };
  }

  private throwMappedDatabaseError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as { code?: string };
      if (driverError.code === '23505') {
        throw new ConflictException(
          'A customer with the same unique information already exists',
        );
      }
    }
    throw error;
  }
}
