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
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { SupplierPaymentFilterDto } from './dto/supplier-payment-filter.dto';
import {
  PaginatedSupplierPaymentsResponseDto,
  SupplierPaymentAllocationResponseDto,
  SupplierPaymentResponseDto,
} from './dto/supplier-payment-response.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentStatus } from './enums/supplier-payment-status.enum';

@Injectable()
export class SupplierPaymentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(SupplierPayment)
    private readonly paymentRepository: Repository<SupplierPayment>,

    @InjectRepository(SupplierPaymentAllocation)
    private readonly allocationRepository: Repository<SupplierPaymentAllocation>,

    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,

    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly accountingSettingsRepository:
      Repository<AccountingSettingsEntity>,

    private readonly accountingEngineService:
      AccountingEngineService,
  ) {}

  async create(
    dto: CreateSupplierPaymentDto,
    companyId: string,
    userId: string,
  ): Promise<SupplierPaymentResponseDto> {
    await this.validateSupplier(dto.supplierId, companyId);

    const allocations = dto.allocations ?? [];
    await this.validateAllocations(
      allocations,
      dto.supplierId,
      companyId,
      dto.amount,
    );

    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(SupplierPayment);
      const allocationRepository =
        manager.getRepository(SupplierPaymentAllocation);
      
      const invoiceRepository =
        manager.getRepository(PurchaseInvoiceEntity);

      const allocatedAmount = this.round(
        allocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.allocatedAmount),
          0,
        ),
      );

      const payment = paymentRepository.create({
        companyId,
        supplierId: dto.supplierId,
        paymentNumber: await this.generatePaymentNumber(
          companyId,
          dto.paymentDate,
        ),
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        amount: this.round(dto.amount),
        allocatedAmount,
        unallocatedAmount: this.round(dto.amount - allocatedAmount),
        referenceNumber: this.optional(dto.referenceNumber),
        notes: this.optional(dto.notes),
        status: SupplierPaymentStatus.Draft,
        createdBy: userId,
        updatedBy: userId,
        allocations: [],
      });

      const savedPayment = await paymentRepository.save(payment);

     savedPayment.allocations = await Promise.all(
  allocations.map(async (allocation) => {
    const invoice =
      await invoiceRepository.findOne({
        where: {
          id: allocation.purchaseInvoiceId,
          companyId,
          supplierId: dto.supplierId,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        `Purchase invoice ${allocation.purchaseInvoiceId} not found.`,
      );
    }

    const allocatedAmount =
      this.round(
        allocation.allocatedAmount,
      );

    const invoiceBalanceBefore =
      this.round(
        Number(invoice.balanceDue),
      );

    const invoiceBalanceAfter =
      this.round(
        Math.max(
          0,
          invoiceBalanceBefore -
            allocatedAmount,
        ),
      );

    return allocationRepository.create({
      supplierPaymentId:
        savedPayment.id,
      purchaseInvoiceId:
        allocation.purchaseInvoiceId,
      allocatedAmount,
      invoiceBalanceBefore,
      invoiceBalanceAfter,
    });
  }),
);

      if (savedPayment.allocations.length > 0) {
        savedPayment.allocations = await allocationRepository.save(
          savedPayment.allocations,
        );
      }

      return this.toResponse(savedPayment);
    });
  }

  async findAll(
    filter: SupplierPaymentFilterDto,
    companyId: string,
  ): Promise<PaginatedSupplierPaymentsResponseDto> {
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
            .orWhere('payment.notes ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.supplierId) {
      query.andWhere('payment.supplier_id = :supplierId', {
        supplierId: filter.supplierId,
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
      data: payments.map((payment) => this.toResponse(payment)),
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
  ): Promise<SupplierPaymentResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateSupplierPaymentDto,
    companyId: string,
    userId: string,
  ): Promise<SupplierPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(SupplierPayment);
      const allocationRepository =
        manager.getRepository(SupplierPaymentAllocation);

        const invoiceRepository =
    manager.getRepository(PurchaseInvoiceEntity);

      const payment = await paymentRepository.findOne({
        where: { id, companyId },
        relations: { allocations: true },
      });

      if (!payment) {
        throw new NotFoundException('Supplier payment not found.');
      }

      this.ensureDraft(payment);

      const supplierId = dto.supplierId ?? payment.supplierId;
      const amount = dto.amount ?? Number(payment.amount);
      const allocations =
        dto.allocations ??
        payment.allocations.map((allocation) => ({
          purchaseInvoiceId: allocation.purchaseInvoiceId,
          allocatedAmount: Number(allocation.allocatedAmount),
        }));

      await this.validateSupplier(supplierId, companyId);
      await this.validateAllocations(
        allocations,
        supplierId,
        companyId,
        amount,
      );

      if (dto.allocations) {
        await allocationRepository.delete({
          supplierPaymentId: payment.id,
        });

        payment.allocations = await Promise.all(
  dto.allocations.map(async (allocation) => {
    const invoice =
      await invoiceRepository.findOne({
        where: {
          id: allocation.purchaseInvoiceId,
          companyId,
          supplierId,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        `Purchase invoice ${allocation.purchaseInvoiceId} not found.`,
      );
    }

    const allocatedAmount =
      this.round(
        allocation.allocatedAmount,
      );

    const invoiceBalanceBefore =
      this.round(
        Number(invoice.balanceDue),
      );

    const invoiceBalanceAfter =
      this.round(
        Math.max(
          0,
          invoiceBalanceBefore -
            allocatedAmount,
        ),
      );

    return allocationRepository.create({
      supplierPaymentId:
        payment.id,
      purchaseInvoiceId:
        allocation.purchaseInvoiceId,
      allocatedAmount,
      invoiceBalanceBefore,
      invoiceBalanceAfter,
    });
  }),
);

        payment.allocations =
          payment.allocations.length > 0
            ? await allocationRepository.save(payment.allocations)
            : [];
      }

      if (dto.supplierId !== undefined) {
        payment.supplierId = dto.supplierId;
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

      if (dto.notes !== undefined) {
        payment.notes = this.optional(dto.notes);
      }

      payment.allocatedAmount = this.round(
        payment.allocations.reduce(
          (sum, allocation) =>
            sum + Number(allocation.allocatedAmount),
          0,
        ),
      );

      payment.unallocatedAmount = this.round(
        Number(payment.amount) - payment.allocatedAmount,
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
  ): Promise<SupplierPaymentResponseDto> {
    const existing =
      await this.paymentRepository.findOne({
        where: { id, companyId },
        relations: { allocations: true },
      });

    if (!existing) {
      throw new NotFoundException(
        'Supplier payment not found.',
      );
    }

    /*
     * Retry-safe accounting recovery for a payment whose business posting
     * succeeded but whose journal posting failed afterward.
     */
    if (
      existing.status === SupplierPaymentStatus.Posted
    ) {
      await this.autoPostAccountingIfEnabled(
        existing.id,
        companyId,
        userId,
      );

      return this.toResponse(existing);
    }

    const saved =
      await this.dataSource.transaction(
        async (manager) => {
          const paymentRepository =
            manager.getRepository(
              SupplierPayment,
            );

          const allocationRepository =
            manager.getRepository(
              SupplierPaymentAllocation,
            );

          const invoiceRepository =
            manager.getRepository(
              PurchaseInvoiceEntity,
            );

          const supplierRepository =
            manager.getRepository(
              SupplierEntity,
            );

          const payment =
            await paymentRepository.findOne({
              where: { id, companyId },
              relations: {
                allocations: true,
              },
            });

          if (!payment) {
            throw new NotFoundException(
              'Supplier payment not found.',
            );
          }

          this.ensureDraft(payment);

          const supplier =
            await supplierRepository.findOne({
              where: {
                id: payment.supplierId,
                companyId,
              },
            });

          if (!supplier) {
            throw new NotFoundException(
              'Supplier not found.',
            );
          }

          for (
            const allocation of payment.allocations
          ) {
            const invoice =
              await invoiceRepository.findOne({
                where: {
                  id:
                    allocation.purchaseInvoiceId,
                  companyId,
                  supplierId:
                    payment.supplierId,
                },
              });

            if (!invoice) {
              throw new NotFoundException(
                `Purchase invoice ${allocation.purchaseInvoiceId} not found.`,
              );
            }

            if (
              invoice.status !==
                PurchaseInvoiceStatus.Posted &&
              invoice.status !==
                PurchaseInvoiceStatus.Paid
            ) {
              throw new ConflictException(
                `Purchase invoice ${invoice.invoiceNumber} must be posted before payment.`,
              );
            }

            const allocationAmount =
              Number(
                allocation.allocatedAmount,
              );

            const balanceDue =
              Number(invoice.balanceDue);

            if (
              allocationAmount >
              balanceDue
            ) {
              throw new BadRequestException(
                `Allocation exceeds balance due for invoice ${invoice.invoiceNumber}.`,
              );
            }

            invoice.paidAmount =
              this.round(
                Number(
                  invoice.paidAmount,
                ) +
                  allocationAmount,
              );

            invoice.balanceDue =
              this.round(
                Number(
                  invoice.grandTotal,
                ) -
                  Number(
                    invoice.paidAmount,
                  ),
              );

            invoice.status =
              invoice.balanceDue === 0
                ? PurchaseInvoiceStatus.Paid
                : PurchaseInvoiceStatus.Posted;

            await invoiceRepository.save(
              invoice,
            );
          }

          supplier.currentBalance =
            this.round(
              Number(
                supplier.currentBalance ??
                  0,
              ) -
                Number(
                  payment.amount,
                ),
            );

          await supplierRepository.save(
            supplier,
          );

          payment.status =
            SupplierPaymentStatus.Posted;

          payment.updatedBy =
            userId;

          return paymentRepository.save(
            payment,
          );
        },
      );

    await this.autoPostAccountingIfEnabled(
      saved.id,
      companyId,
      userId,
    );

    return this.toResponse(saved);
  }

  private async autoPostAccountingIfEnabled(
    paymentId: string,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const settings =
      await this.accountingSettingsRepository.findOne({
        where: { companyId },
      });

    if (
      settings?.autoPostSupplierPayments !== false
    ) {
      await this.accountingEngineService.postSupplierPayment(
        paymentId,
        companyId,
        userId,
      );
    }
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SupplierPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(SupplierPayment);
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const supplierRepository = manager.getRepository(SupplierEntity);

      const payment = await paymentRepository.findOne({
        where: { id, companyId },
        relations: { allocations: true },
      });

      if (!payment) {
        throw new NotFoundException('Supplier payment not found.');
      }

      if (payment.status === SupplierPaymentStatus.Cancelled) {
        return this.toResponse(payment);
      }

      if (payment.status === SupplierPaymentStatus.Posted) {
        for (const allocation of payment.allocations) {
          const invoice = await invoiceRepository.findOne({
            where: {
              id: allocation.purchaseInvoiceId,
              companyId,
              supplierId: payment.supplierId,
            },
          });

          if (!invoice) {
            throw new NotFoundException(
              `Purchase invoice ${allocation.purchaseInvoiceId} not found.`,
            );
          }

          const allocationAmount = Number(
            allocation.allocatedAmount,
          );

          if (Number(invoice.paidAmount) < allocationAmount) {
            throw new ConflictException(
              `Cannot cancel payment because invoice ${invoice.invoiceNumber} paid amount is inconsistent.`,
            );
          }

          invoice.paidAmount = this.round(
            Number(invoice.paidAmount) - allocationAmount,
          );

          invoice.balanceDue = this.round(
            Number(invoice.grandTotal) -
              Number(invoice.paidAmount),
          );

          invoice.status =
            invoice.balanceDue === 0
              ? PurchaseInvoiceStatus.Paid
              : PurchaseInvoiceStatus.Posted;

          await invoiceRepository.save(invoice);
        }

        const supplier = await supplierRepository.findOne({
          where: {
            id: payment.supplierId,
            companyId,
          },
        });

        if (!supplier) {
          throw new NotFoundException('Supplier not found.');
        }

        supplier.currentBalance = this.round(
          Number(supplier.currentBalance ?? 0) +
            Number(payment.amount),
        );

        await supplierRepository.save(supplier);
      }

      payment.status = SupplierPaymentStatus.Cancelled;
      payment.updatedBy = userId;

      return this.toResponse(
        await paymentRepository.save(payment),
      );
    });
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const payment = await this.getEntity(id, companyId);
    this.ensureDraft(payment);

    await this.paymentRepository.softRemove(payment);

    return {
      message: 'Supplier payment deleted successfully.',
    };
  }

  private async validateSupplier(
    supplierId: string,
    companyId: string,
  ): Promise<void> {
    const supplier = await this.supplierRepository.findOne({
      where: {
        id: supplierId,
        companyId,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
  }

  private async validateAllocations(
    allocations: Array<{
      purchaseInvoiceId: string;
      allocatedAmount: number;
    }>,
    supplierId: string,
    companyId: string,
    paymentAmount: number,
  ): Promise<void> {
    const invoiceIds = allocations.map(
      (allocation) => allocation.purchaseInvoiceId,
    );

    if (new Set(invoiceIds).size !== invoiceIds.length) {
      throw new BadRequestException(
        'Duplicate invoice allocations are not allowed.',
      );
    }

    const allocatedTotal = this.round(
      allocations.reduce(
        (sum, allocation) =>
          sum + Number(allocation.allocatedAmount),
        0,
      ),
    );

    if (allocatedTotal > Number(paymentAmount)) {
      throw new BadRequestException(
        'Allocated amount cannot exceed payment amount.',
      );
    }

    for (const allocation of allocations) {
      const invoice = await this.purchaseInvoiceRepository.findOne({
        where: {
          id: allocation.purchaseInvoiceId,
          companyId,
          supplierId,
        },
      });

      if (!invoice) {
        throw new NotFoundException(
          `Purchase invoice ${allocation.purchaseInvoiceId} not found.`,
        );
      }

      if (invoice.status === PurchaseInvoiceStatus.Cancelled) {
        throw new ConflictException(
          `Cancelled invoice ${invoice.invoiceNumber} cannot receive payments.`,
        );
      }

      if (
        Number(allocation.allocatedAmount) >
        Number(invoice.balanceDue)
      ) {
        throw new BadRequestException(
          `Allocation exceeds balance due for invoice ${invoice.invoiceNumber}.`,
        );
      }
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<SupplierPayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, companyId },
      relations: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundException('Supplier payment not found.');
    }

    return payment;
  }

  private ensureDraft(payment: SupplierPayment): void {
    if (payment.status !== SupplierPaymentStatus.Draft) {
      throw new ConflictException(
        'Only draft supplier payments can be modified.',
      );
    }
  }

  private async generatePaymentNumber(
    companyId: string,
    paymentDate: string,
  ): Promise<string> {
    const year = new Date(paymentDate).getUTCFullYear();
    const prefix = `SPAY-${year}-`;

    const latest = await this.paymentRepository
      .createQueryBuilder('payment')
      .withDeleted()
      .select('payment.payment_number', 'paymentNumber')
      .where('payment.company_id = :companyId', { companyId })
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
  allocation: SupplierPaymentAllocation,
): SupplierPaymentAllocationResponseDto {
  return {
    id: allocation.id,
    purchaseInvoiceId: allocation.purchaseInvoiceId,
    allocatedAmount: Number(allocation.allocatedAmount),
    invoiceBalanceBefore: Number(
      allocation.invoiceBalanceBefore ?? 0,
    ),
    invoiceBalanceAfter: Number(
      allocation.invoiceBalanceAfter ?? 0,
    ),
  };
}

private toResponse(
  payment: SupplierPayment,
): SupplierPaymentResponseDto {
  return {
    id: payment.id,
    companyId: payment.companyId,
    supplierId: payment.supplierId,
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
    cancelledBy: payment.cancelledBy,
    cancelledAt: payment.cancelledAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    deletedAt: payment.deletedAt,
  };
}
}
