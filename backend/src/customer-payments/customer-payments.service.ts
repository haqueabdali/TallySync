import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  Repository,
} from 'typeorm';

import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceStatus } from '../sales-invoices/enums/sales-invoice-status.enum';
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto';
import { CustomerPaymentFilterDto } from './dto/customer-payment-filter.dto';
import {
  CustomerPaymentAllocationResponseDto,
  CustomerPaymentResponseDto,
  PaginatedCustomerPaymentsResponseDto,
} from './dto/customer-payment-response.dto';
import { ReverseCustomerPaymentDto } from './dto/reverse-customer-payment.dto';
import { UpdateCustomerPaymentDto } from './dto/update-customer-payment.dto';
import { CustomerPaymentAllocationEntity } from './entities/customer-payment-allocation.entity';
import { CustomerPaymentEntity } from './entities/customer-payment.entity';
import { CustomerPaymentStatus } from './enums/customer-payment-status.enum';

@Injectable()
export class CustomerPaymentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(CustomerPaymentEntity)
    private readonly paymentRepository: Repository<CustomerPaymentEntity>,

    @InjectRepository(CustomerPaymentAllocationEntity)
    private readonly allocationRepository: Repository<CustomerPaymentAllocationEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,

    private readonly accountingEngineService: AccountingEngineService,
  ) {}

  async create(
    dto: CreateCustomerPaymentDto,
    companyId: string,
    userId: string,
  ): Promise<CustomerPaymentResponseDto> {
    const customer = await this.getCustomer(dto.customerId, companyId);
    await this.validateAllocations(dto, customer.id, companyId);

    return this.dataSource.transaction(async (manager) => {
      const paymentRepository =
        manager.getRepository(CustomerPaymentEntity);
      const allocationRepository =
        manager.getRepository(CustomerPaymentAllocationEntity);

      const allocatedAmount = this.round(
        dto.allocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.allocatedAmount),
          0,
        ),
      );

      if (allocatedAmount > Number(dto.amount)) {
        throw new BadRequestException(
          'Allocated amount cannot exceed payment amount.',
        );
      }

      const payment = paymentRepository.create({
        companyId,
        customerId: dto.customerId,
        paymentNumber: await this.generatePaymentNumber(
          companyId,
          dto.paymentDate,
        ),
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod,
        status: CustomerPaymentStatus.DRAFT,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        amount: this.round(dto.amount),
        allocatedAmount,
        unallocatedAmount: this.round(
          Number(dto.amount) - allocatedAmount,
        ),
        referenceNumber: this.optional(dto.referenceNumber),
        bankAccountName: this.optional(dto.bankAccountName),
        chequeNumber: this.optional(dto.chequeNumber),
        chequeDate: dto.chequeDate ?? null,
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        reversedBy: null,
        reversedAt: null,
        reversalReason: null,
        allocations: [],
      });

      const savedPayment = await paymentRepository.save(payment);

      savedPayment.allocations = dto.allocations.map(
        (allocation) =>
          allocationRepository.create({
            customerPaymentId: savedPayment.id,
            salesInvoiceId: allocation.salesInvoiceId,
            allocatedAmount: this.round(
              allocation.allocatedAmount,
            ),
            invoiceBalanceBefore: 0,
            invoiceBalanceAfter: 0,
          }),
      );

      savedPayment.allocations =
        await allocationRepository.save(
          savedPayment.allocations,
        );

      return this.toResponse(savedPayment);
    });
  }

  async findAll(
    filter: CustomerPaymentFilterDto,
    companyId: string,
  ): Promise<PaginatedCustomerPaymentsResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.allocations', 'allocations')
      .where('payment.company_id = :companyId', { companyId });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('payment.payment_number ILIKE :search', {
            search,
          })
            .orWhere('payment.reference_number ILIKE :search', {
              search,
            })
            .orWhere('payment.cheque_number ILIKE :search', {
              search,
            })
            .orWhere('payment.notes ILIKE :search', { search });
        }),
      );
    }

    if (filter.customerId) {
      query.andWhere('payment.customer_id = :customerId', {
        customerId: filter.customerId,
      });
    }

    if (filter.status) {
      query.andWhere('payment.status = :status', {
        status: filter.status,
      });
    }

    if (filter.paymentMethod) {
      query.andWhere('payment.payment_method = :paymentMethod', {
        paymentMethod: filter.paymentMethod,
      });
    }

    if (filter.dateFrom) {
      query.andWhere('payment.payment_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('payment.payment_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    const sortColumns: Record<string, string> = {
      paymentNumber: 'payment.payment_number',
      paymentDate: 'payment.payment_date',
      amount: 'payment.amount',
      allocatedAmount: 'payment.allocated_amount',
      unallocatedAmount: 'payment.unallocated_amount',
      createdAt: 'payment.created_at',
      updatedAt: 'payment.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'payment.created_at',
        filter.sortOrder,
      )
      .addOrderBy('payment.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [payments, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: payments.map((payment) =>
        this.toResponse(payment),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    companyId: string,
  ): Promise<CustomerPaymentResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateCustomerPaymentDto,
    companyId: string,
    userId: string,
  ): Promise<CustomerPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepository =
        manager.getRepository(CustomerPaymentEntity);
      const allocationRepository =
        manager.getRepository(CustomerPaymentAllocationEntity);

      const payment = await paymentRepository.findOne({
        where: { id, companyId },
        relations: { allocations: true },
      });

      if (!payment) {
        throw new NotFoundException(
          'Customer payment not found.',
        );
      }

      this.ensureDraft(payment);

      const mergedDto: CreateCustomerPaymentDto = {
        customerId: dto.customerId ?? payment.customerId,
        paymentDate: dto.paymentDate ?? payment.paymentDate,
        paymentMethod:
          dto.paymentMethod ?? payment.paymentMethod,
        currency: dto.currency ?? payment.currency,
        amount: dto.amount ?? Number(payment.amount),
        referenceNumber:
          dto.referenceNumber ??
          payment.referenceNumber ??
          undefined,
        bankAccountName:
          dto.bankAccountName ??
          payment.bankAccountName ??
          undefined,
        chequeNumber:
          dto.chequeNumber ??
          payment.chequeNumber ??
          undefined,
        chequeDate:
          dto.chequeDate ??
          payment.chequeDate ??
          undefined,
        notes: dto.notes ?? payment.notes ?? undefined,
        allocations:
          dto.allocations ??
          payment.allocations.map((allocation) => ({
            salesInvoiceId: allocation.salesInvoiceId,
            allocatedAmount: Number(
              allocation.allocatedAmount,
            ),
          })),
      };

      await this.getCustomer(
        mergedDto.customerId,
        companyId,
      );
      await this.validateAllocations(
        mergedDto,
        mergedDto.customerId,
        companyId,
      );

      const allocatedAmount = this.round(
        mergedDto.allocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.allocatedAmount),
          0,
        ),
      );

      if (allocatedAmount > Number(mergedDto.amount)) {
        throw new BadRequestException(
          'Allocated amount cannot exceed payment amount.',
        );
      }

      if (dto.allocations) {
        await allocationRepository.delete({
          customerPaymentId: payment.id,
        });

        payment.allocations = dto.allocations.map(
          (allocation) =>
            allocationRepository.create({
              customerPaymentId: payment.id,
              salesInvoiceId: allocation.salesInvoiceId,
              allocatedAmount: this.round(
                allocation.allocatedAmount,
              ),
              invoiceBalanceBefore: 0,
              invoiceBalanceAfter: 0,
            }),
        );

        payment.allocations =
          await allocationRepository.save(
            payment.allocations,
          );
      }

      if (dto.customerId !== undefined) {
        payment.customerId = dto.customerId;
      }

      if (dto.paymentDate !== undefined) {
        payment.paymentDate = dto.paymentDate;
      }

      if (dto.paymentMethod !== undefined) {
        payment.paymentMethod = dto.paymentMethod;
      }

      if (dto.currency !== undefined) {
        payment.currency = dto.currency.toUpperCase();
      }

      if (dto.amount !== undefined) {
        payment.amount = this.round(dto.amount);
      }

      if (dto.referenceNumber !== undefined) {
        payment.referenceNumber = this.optional(
          dto.referenceNumber,
        );
      }

      if (dto.bankAccountName !== undefined) {
        payment.bankAccountName = this.optional(
          dto.bankAccountName,
        );
      }

      if (dto.chequeNumber !== undefined) {
        payment.chequeNumber = this.optional(
          dto.chequeNumber,
        );
      }

      if (dto.chequeDate !== undefined) {
        payment.chequeDate = dto.chequeDate ?? null;
      }

      if (dto.notes !== undefined) {
        payment.notes = this.optional(dto.notes);
      }

      payment.allocatedAmount = allocatedAmount;
      payment.unallocatedAmount = this.round(
        Number(payment.amount) - allocatedAmount,
      );
      payment.updatedBy = userId;

      return this.toResponse(
        await paymentRepository.save(payment),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<CustomerPaymentResponseDto> {
    const postedPayment = await this.dataSource.transaction(async (manager) => {
      const paymentRepository =
        manager.getRepository(CustomerPaymentEntity);
      const allocationRepository =
        manager.getRepository(CustomerPaymentAllocationEntity);
      const invoiceRepository =
        manager.getRepository(SalesInvoiceEntity);
      const customerRepository =
        manager.getRepository(CustomerEntity);

      const payment = await paymentRepository.findOne({
        where: { id, companyId },
        relations: { allocations: true },
      });

      if (!payment) {
        throw new NotFoundException(
          'Customer payment not found.',
        );
      }

      if (payment.status === CustomerPaymentStatus.POSTED) {
        return this.toResponse(payment);
      }

      this.ensureDraft(payment);

      if (!payment.allocations.length) {
        throw new BadRequestException(
          'Customer payment must contain at least one allocation.',
        );
      }

      let totalAllocated = 0;

      for (const allocation of payment.allocations) {
        const invoice = await invoiceRepository.findOne({
          where: {
            id: allocation.salesInvoiceId,
            companyId,
            customerId: payment.customerId,
          },
        });

        if (!invoice) {
          throw new NotFoundException(
            `Sales invoice ${allocation.salesInvoiceId} not found.`,
          );
        }

        if (
          invoice.status !== SalesInvoiceStatus.POSTED &&
          invoice.status !==
            SalesInvoiceStatus.PARTIALLY_PAID
        ) {
          throw new ConflictException(
            `Invoice ${invoice.invoiceNumber} is not open for payment.`,
          );
        }

        const balanceBefore = this.round(
          Number(invoice.balanceDue),
        );
        const allocated = this.round(
          Number(allocation.allocatedAmount),
        );

        if (allocated > balanceBefore) {
          throw new BadRequestException(
            `Allocation exceeds the outstanding balance of invoice ${invoice.invoiceNumber}.`,
          );
        }

        const balanceAfter = this.round(
          balanceBefore - allocated,
        );

        invoice.paidAmount = this.round(
          Number(invoice.paidAmount) + allocated,
        );
        invoice.balanceDue = balanceAfter;
        invoice.status =
          balanceAfter === 0
            ? SalesInvoiceStatus.PAID
            : SalesInvoiceStatus.PARTIALLY_PAID;

        allocation.invoiceBalanceBefore = balanceBefore;
        allocation.invoiceBalanceAfter = balanceAfter;

        totalAllocated = this.round(
          totalAllocated + allocated,
        );

        await invoiceRepository.save(invoice);
        await allocationRepository.save(allocation);
      }

      if (totalAllocated > Number(payment.amount)) {
        throw new BadRequestException(
          'Allocated amount cannot exceed payment amount.',
        );
      }

      const customer = await customerRepository.findOne({
        where: {
          id: payment.customerId,
          companyId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found.');
      }

      if ('currentBalance' in customer) {
        const currentBalance = Number(
          (
            customer as CustomerEntity & {
              currentBalance?: number | string | null;
            }
          ).currentBalance ?? 0,
        );

        (
          customer as CustomerEntity & {
            currentBalance: number;
          }
        ).currentBalance = this.round(
          currentBalance - totalAllocated,
        );

        await customerRepository.save(customer);
      }

      payment.allocatedAmount = totalAllocated;
      payment.unallocatedAmount = this.round(
        Number(payment.amount) - totalAllocated,
      );
      payment.status = CustomerPaymentStatus.POSTED;
      payment.postedBy = userId;
      payment.postedAt = new Date();
      payment.updatedBy = userId;

      return this.toResponse(
        await paymentRepository.save(payment),
      );
    });

    await this.accountingEngineService.autoPostCustomerPayment(
      postedPayment.id,
      companyId,
      userId,
    );

    return postedPayment;
  }
  async reverse(
    id: string,
    dto: ReverseCustomerPaymentDto,
    companyId: string,
    userId: string,
  ): Promise<CustomerPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepository =
        manager.getRepository(CustomerPaymentEntity);
      const invoiceRepository =
        manager.getRepository(SalesInvoiceEntity);
      const customerRepository =
        manager.getRepository(CustomerEntity);

      const payment = await paymentRepository.findOne({
        where: { id, companyId },
        relations: { allocations: true },
      });

      if (!payment) {
        throw new NotFoundException(
          'Customer payment not found.',
        );
      }

      if (payment.status !== CustomerPaymentStatus.POSTED) {
        throw new ConflictException(
          'Only posted customer payments can be reversed.',
        );
      }

      for (const allocation of payment.allocations) {
        const invoice = await invoiceRepository.findOne({
          where: {
            id: allocation.salesInvoiceId,
            companyId,
            customerId: payment.customerId,
          },
        });

        if (!invoice) {
          throw new NotFoundException(
            `Sales invoice ${allocation.salesInvoiceId} not found.`,
          );
        }

        const allocated = this.round(
          Number(allocation.allocatedAmount),
        );

        invoice.paidAmount = this.round(
          Math.max(
            0,
            Number(invoice.paidAmount) - allocated,
          ),
        );
        invoice.balanceDue = this.round(
          Number(invoice.balanceDue) + allocated,
        );
        invoice.status =
          invoice.paidAmount === 0
            ? SalesInvoiceStatus.POSTED
            : SalesInvoiceStatus.PARTIALLY_PAID;

        await invoiceRepository.save(invoice);
      }

      const customer = await customerRepository.findOne({
        where: {
          id: payment.customerId,
          companyId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found.');
      }

      if ('currentBalance' in customer) {
        const currentBalance = Number(
          (
            customer as CustomerEntity & {
              currentBalance?: number | string | null;
            }
          ).currentBalance ?? 0,
        );

        (
          customer as CustomerEntity & {
            currentBalance: number;
          }
        ).currentBalance = this.round(
          currentBalance + Number(payment.allocatedAmount),
        );

        await customerRepository.save(customer);
      }

      payment.status = CustomerPaymentStatus.REVERSED;
      payment.reversedBy = userId;
      payment.reversedAt = new Date();
      payment.reversalReason = dto.reversalReason.trim();
      payment.updatedBy = userId;

      return this.toResponse(
        await paymentRepository.save(payment),
      );
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<CustomerPaymentResponseDto> {
    const payment = await this.getEntity(id, companyId);

    if (payment.status === CustomerPaymentStatus.CANCELLED) {
      return this.toResponse(payment);
    }

    if (payment.status !== CustomerPaymentStatus.DRAFT) {
      throw new ConflictException(
        'Only draft customer payments can be cancelled.',
      );
    }

    payment.status = CustomerPaymentStatus.CANCELLED;
    payment.updatedBy = userId;

    return this.toResponse(
      await this.paymentRepository.save(payment),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const payment = await this.getEntity(id, companyId);
    this.ensureDraft(payment);

    await this.paymentRepository.softRemove(payment);

    return {
      message: 'Customer payment deleted successfully.',
    };
  }

  private async validateAllocations(
    dto: CreateCustomerPaymentDto,
    customerId: string,
    companyId: string,
  ): Promise<void> {
    const invoiceIds = dto.allocations.map(
      (allocation) => allocation.salesInvoiceId,
    );

    if (new Set(invoiceIds).size !== invoiceIds.length) {
      throw new BadRequestException(
        'Duplicate invoice allocations are not allowed.',
      );
    }

    for (const allocation of dto.allocations) {
      const invoice = await this.salesInvoiceRepository.findOne({
        where: {
          id: allocation.salesInvoiceId,
          companyId,
          customerId,
        },
      });

      if (!invoice) {
        throw new NotFoundException(
          `Sales invoice ${allocation.salesInvoiceId} not found.`,
        );
      }

      if (
        invoice.status !== SalesInvoiceStatus.POSTED &&
        invoice.status !== SalesInvoiceStatus.PARTIALLY_PAID
      ) {
        throw new ConflictException(
          `Invoice ${invoice.invoiceNumber} is not open for payment.`,
        );
      }

      if (
        Number(allocation.allocatedAmount) >
        Number(invoice.balanceDue)
      ) {
        throw new BadRequestException(
          `Allocation exceeds the outstanding balance of invoice ${invoice.invoiceNumber}.`,
        );
      }
    }
  }

  private async getCustomer(
    id: string,
    companyId: string,
  ): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: {
        id,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<CustomerPaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id, companyId },
      relations: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundException(
        'Customer payment not found.',
      );
    }

    return payment;
  }

  private ensureDraft(
    payment: CustomerPaymentEntity,
  ): void {
    if (payment.status !== CustomerPaymentStatus.DRAFT) {
      throw new ConflictException(
        'Only draft customer payments can be modified.',
      );
    }
  }

  private async generatePaymentNumber(
    companyId: string,
    paymentDate: string,
  ): Promise<string> {
    const year = new Date(paymentDate).getUTCFullYear();
    const prefix = `CP-${year}-`;

    const latest = await this.paymentRepository
      .createQueryBuilder('payment')
      .withDeleted()
      .select('payment.payment_number', 'paymentNumber')
      .where('payment.company_id = :companyId', {
        companyId,
      })
      .andWhere('payment.payment_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('payment.payment_number', 'DESC')
      .getRawOne<{ paymentNumber?: string }>();

    const current = latest?.paymentNumber
      ? Number(latest.paymentNumber.replace(prefix, ''))
      : 0;

    return `${prefix}${String(current + 1).padStart(6, '0')}`;
  }

  private optional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toAllocationResponse(
    allocation: CustomerPaymentAllocationEntity,
  ): CustomerPaymentAllocationResponseDto {
    return {
      id: allocation.id,
      salesInvoiceId: allocation.salesInvoiceId,
      allocatedAmount: Number(allocation.allocatedAmount),
      invoiceBalanceBefore: Number(
        allocation.invoiceBalanceBefore,
      ),
      invoiceBalanceAfter: Number(
        allocation.invoiceBalanceAfter,
      ),
    };
  }

  private toResponse(
    payment: CustomerPaymentEntity,
  ): CustomerPaymentResponseDto {
    return {
      id: payment.id,
      companyId: payment.companyId,
      customerId: payment.customerId,
      paymentNumber: payment.paymentNumber,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      currency: payment.currency,
      amount: Number(payment.amount),
      allocatedAmount: Number(payment.allocatedAmount),
      unallocatedAmount: Number(payment.unallocatedAmount),
      referenceNumber: payment.referenceNumber,
      bankAccountName: payment.bankAccountName,
      chequeNumber: payment.chequeNumber,
      chequeDate: payment.chequeDate,
      notes: payment.notes,
      allocations: (payment.allocations ?? []).map(
        (allocation) =>
          this.toAllocationResponse(allocation),
      ),
      createdBy: payment.createdBy,
      updatedBy: payment.updatedBy,
      postedBy: payment.postedBy,
      postedAt: payment.postedAt,
      reversedBy: payment.reversedBy,
      reversedAt: payment.reversedAt,
      reversalReason: payment.reversalReason,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      deletedAt: payment.deletedAt,
    };
  }
}
