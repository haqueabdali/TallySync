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

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto';
import { SalesQuotationFilterDto } from './dto/sales-quotation-filter.dto';
import {
  PaginatedSalesQuotationsResponseDto,
  SalesQuotationItemResponseDto,
  SalesQuotationResponseDto,
} from './dto/sales-quotation-response.dto';
import { UpdateSalesQuotationDto } from './dto/update-sales-quotation.dto';
import { SalesQuotationItem } from './entities/sales-quotation-item.entity';
import { SalesQuotation } from './entities/sales-quotation.entity';
import { SalesQuotationStatus } from './enums/sales-quotation-status.enum';

@Injectable()
export class SalesQuotationsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(SalesQuotation)
    private readonly quotationRepository: Repository<SalesQuotation>,

    @InjectRepository(SalesQuotationItem)
    private readonly quotationItemRepository: Repository<SalesQuotationItem>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async create(
    dto: CreateSalesQuotationDto,
    companyId: string,
    userId: string,
  ): Promise<SalesQuotationResponseDto> {
    await this.validateReferences(dto, companyId);
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));

    return this.dataSource.transaction(async (manager) => {
      const quotationRepository = manager.getRepository(SalesQuotation);
      const itemRepository = manager.getRepository(SalesQuotationItem);

      const quotation = quotationRepository.create({
        companyId,
        customerId: dto.customerId,
        quotationNumber: await this.generateQuotationNumber(
          companyId,
          dto.quotationDate,
        ),
        quotationDate: dto.quotationDate,
        validUntil: dto.validUntil ?? null,
        status: SalesQuotationStatus.Draft,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: this.round(dto.shippingTotal ?? 0),
        grandTotal: 0,
        customerReference: this.optional(dto.customerReference),
        terms: this.optional(dto.terms),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        items: [],
      });

      const savedQuotation = await quotationRepository.save(quotation);

      savedQuotation.items = dto.items.map((line) => {
        const totals = this.calculateLine(
          line.quantity,
          line.unitPrice,
          line.discountPercent ?? 0,
          line.taxPercent ?? 0,
        );

        return itemRepository.create({
          salesQuotationId: savedQuotation.id,
          itemId: line.itemId,
          description: this.optional(line.description),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent ?? 0,
          taxPercent: line.taxPercent ?? 0,
          ...totals,
        });
      });

      savedQuotation.items = await itemRepository.save(
        savedQuotation.items,
      );

      this.calculateQuotationTotals(savedQuotation);

      return this.toResponse(
        await quotationRepository.save(savedQuotation),
      );
    });
  }

  async findAll(
    filter: SalesQuotationFilterDto,
    companyId: string,
  ): Promise<PaginatedSalesQuotationsResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.quotationRepository
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.items', 'items')
      .where('quotation.company_id = :companyId', { companyId });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('quotation.quotation_number ILIKE :search', {
            search,
          })
            .orWhere('quotation.customer_reference ILIKE :search', {
              search,
            })
            .orWhere('quotation.notes ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.customerId) {
      query.andWhere('quotation.customer_id = :customerId', {
        customerId: filter.customerId,
      });
    }

    if (filter.status) {
      query.andWhere('quotation.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere('quotation.quotation_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('quotation.quotation_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    const sortColumns: Record<string, string> = {
      quotationNumber: 'quotation.quotation_number',
      quotationDate: 'quotation.quotation_date',
      validUntil: 'quotation.valid_until',
      grandTotal: 'quotation.grand_total',
      createdAt: 'quotation.created_at',
      updatedAt: 'quotation.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'quotation.created_at',
        filter.sortOrder,
      )
      .addOrderBy('quotation.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [quotations, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: quotations.map((quotation) =>
        this.toResponse(quotation),
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
  ): Promise<SalesQuotationResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateSalesQuotationDto,
    companyId: string,
    userId: string,
  ): Promise<SalesQuotationResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const quotationRepository = manager.getRepository(SalesQuotation);
      const itemRepository = manager.getRepository(SalesQuotationItem);

      const quotation = await quotationRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!quotation) {
        throw new NotFoundException('Sales quotation not found.');
      }

      this.ensureEditable(quotation);

      const mergedDto: CreateSalesQuotationDto = {
        customerId: dto.customerId ?? quotation.customerId,
        quotationDate:
          dto.quotationDate ?? quotation.quotationDate,
        validUntil:
          dto.validUntil ?? quotation.validUntil ?? undefined,
        currency: dto.currency ?? quotation.currency,
        shippingTotal:
          dto.shippingTotal ?? Number(quotation.shippingTotal),
        customerReference:
          dto.customerReference ??
          quotation.customerReference ??
          undefined,
        terms: dto.terms ?? quotation.terms ?? undefined,
        notes: dto.notes ?? quotation.notes ?? undefined,
        items:
          dto.items ??
          quotation.items.map((item) => ({
            itemId: item.itemId,
            description: item.description ?? undefined,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountPercent: Number(item.discountPercent),
            taxPercent: Number(item.taxPercent),
          })),
      };

      await this.validateReferences(mergedDto, companyId);

      if (dto.items) {
        this.ensureUniqueItems(dto.items.map((item) => item.itemId));

        await itemRepository.delete({
          salesQuotationId: quotation.id,
        });

        quotation.items = dto.items.map((line) => {
          const totals = this.calculateLine(
            line.quantity,
            line.unitPrice,
            line.discountPercent ?? 0,
            line.taxPercent ?? 0,
          );

          return itemRepository.create({
            salesQuotationId: quotation.id,
            itemId: line.itemId,
            description: this.optional(line.description),
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            ...totals,
          });
        });

        quotation.items = await itemRepository.save(
          quotation.items,
        );
      }

      if (dto.customerId !== undefined) {
        quotation.customerId = dto.customerId;
      }

      if (dto.quotationDate !== undefined) {
        quotation.quotationDate = dto.quotationDate;
      }

      if (dto.validUntil !== undefined) {
        quotation.validUntil = dto.validUntil ?? null;
      }

      if (dto.currency !== undefined) {
        quotation.currency = dto.currency.toUpperCase();
      }

      if (dto.shippingTotal !== undefined) {
        quotation.shippingTotal = this.round(
          dto.shippingTotal,
        );
      }

      if (dto.customerReference !== undefined) {
        quotation.customerReference = this.optional(
          dto.customerReference,
        );
      }

      if (dto.terms !== undefined) {
        quotation.terms = this.optional(dto.terms);
      }

      if (dto.notes !== undefined) {
        quotation.notes = this.optional(dto.notes);
      }

      quotation.updatedBy = userId;
      this.calculateQuotationTotals(quotation);

      return this.toResponse(
        await quotationRepository.save(quotation),
      );
    });
  }

  async send(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesQuotationResponseDto> {
    const quotation = await this.getEntity(id, companyId);

    if (quotation.status !== SalesQuotationStatus.Draft) {
      throw new ConflictException(
        'Only draft quotations can be sent.',
      );
    }

    if (!quotation.items.length) {
      throw new BadRequestException(
        'Sales quotation must contain at least one item.',
      );
    }

    quotation.status = SalesQuotationStatus.Sent;
    quotation.updatedBy = userId;

    return this.toResponse(
      await this.quotationRepository.save(quotation),
    );
  }

  async accept(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesQuotationResponseDto> {
    const quotation = await this.getEntity(id, companyId);

    if (quotation.status !== SalesQuotationStatus.Sent) {
      throw new ConflictException(
        'Only sent quotations can be accepted.',
      );
    }

    if (
      quotation.validUntil &&
      new Date(quotation.validUntil).getTime() <
        this.startOfTodayUtc().getTime()
    ) {
      quotation.status = SalesQuotationStatus.Expired;
      quotation.updatedBy = userId;
      await this.quotationRepository.save(quotation);

      throw new ConflictException(
        'The quotation has expired.',
      );
    }

    quotation.status = SalesQuotationStatus.Accepted;
    quotation.updatedBy = userId;

    return this.toResponse(
      await this.quotationRepository.save(quotation),
    );
  }

  async reject(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesQuotationResponseDto> {
    const quotation = await this.getEntity(id, companyId);

    if (quotation.status !== SalesQuotationStatus.Sent) {
      throw new ConflictException(
        'Only sent quotations can be rejected.',
      );
    }

    quotation.status = SalesQuotationStatus.Rejected;
    quotation.updatedBy = userId;

    return this.toResponse(
      await this.quotationRepository.save(quotation),
    );
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesQuotationResponseDto> {
    const quotation = await this.getEntity(id, companyId);

    if (
      quotation.status === SalesQuotationStatus.Accepted
    ) {
      throw new ConflictException(
        'An accepted quotation cannot be cancelled.',
      );
    }

    if (
      quotation.status === SalesQuotationStatus.Cancelled
    ) {
      return this.toResponse(quotation);
    }

    quotation.status = SalesQuotationStatus.Cancelled;
    quotation.updatedBy = userId;

    return this.toResponse(
      await this.quotationRepository.save(quotation),
    );
  }

  async expireOverdue(
    companyId: string,
  ): Promise<{ affected: number }> {
    const result = await this.quotationRepository
      .createQueryBuilder()
      .update(SalesQuotation)
      .set({ status: SalesQuotationStatus.Expired })
      .where('company_id = :companyId', { companyId })
      .andWhere('status = :status', {
        status: SalesQuotationStatus.Sent,
      })
      .andWhere('valid_until IS NOT NULL')
      .andWhere('valid_until < CURRENT_DATE')
      .execute();

    return {
      affected: result.affected ?? 0,
    };
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const quotation = await this.getEntity(id, companyId);

    if (quotation.status !== SalesQuotationStatus.Draft) {
      throw new ConflictException(
        'Only draft quotations can be deleted.',
      );
    }

    await this.quotationRepository.softRemove(quotation);

    return {
      message: 'Sales quotation deleted successfully.',
    };
  }

  private async validateReferences(
    dto: CreateSalesQuotationDto,
    companyId: string,
  ): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: dto.customerId,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    if (
      dto.validUntil &&
      new Date(dto.validUntil).getTime() <
        new Date(dto.quotationDate).getTime()
    ) {
      throw new BadRequestException(
        'Valid-until date cannot be earlier than quotation date.',
      );
    }

    for (const line of dto.items) {
      const item = await this.itemRepository.findOne({
        where: {
          id: line.itemId,
          companyId,
        },
      });

      if (!item) {
        throw new NotFoundException(
          `Item ${line.itemId} not found.`,
        );
      }
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<SalesQuotation> {
    const quotation = await this.quotationRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!quotation) {
      throw new NotFoundException('Sales quotation not found.');
    }

    return quotation;
  }

  private ensureEditable(quotation: SalesQuotation): void {
    if (
      quotation.status !== SalesQuotationStatus.Draft
    ) {
      throw new ConflictException(
        'Only draft quotations can be modified.',
      );
    }
  }

  private ensureUniqueItems(itemIds: string[]): void {
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException(
        'Duplicate items are not allowed.',
      );
    }
  }

  private calculateLine(
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    taxPercent: number,
  ): Pick<
    SalesQuotationItem,
    'lineSubtotal' | 'discountAmount' | 'taxAmount' | 'lineTotal'
  > {
    const lineSubtotal = this.round(quantity * unitPrice);
    const discountAmount = this.round(
      lineSubtotal * (discountPercent / 100),
    );
    const taxableAmount = this.round(
      lineSubtotal - discountAmount,
    );
    const taxAmount = this.round(
      taxableAmount * (taxPercent / 100),
    );
    const lineTotal = this.round(
      taxableAmount + taxAmount,
    );

    return {
      lineSubtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  }

  private calculateQuotationTotals(
    quotation: SalesQuotation,
  ): void {
    quotation.subtotal = this.round(
      quotation.items.reduce(
        (sum, item) => sum + Number(item.lineSubtotal),
        0,
      ),
    );

    quotation.discountTotal = this.round(
      quotation.items.reduce(
        (sum, item) => sum + Number(item.discountAmount),
        0,
      ),
    );

    quotation.taxTotal = this.round(
      quotation.items.reduce(
        (sum, item) => sum + Number(item.taxAmount),
        0,
      ),
    );

    quotation.shippingTotal = this.round(
      Number(quotation.shippingTotal ?? 0),
    );

    quotation.grandTotal = this.round(
      quotation.subtotal -
        quotation.discountTotal +
        quotation.taxTotal +
        quotation.shippingTotal,
    );
  }

  private async generateQuotationNumber(
    companyId: string,
    quotationDate: string,
  ): Promise<string> {
    const year = new Date(quotationDate).getUTCFullYear();
    const prefix = `SQ-${year}-`;

    const latest = await this.quotationRepository
      .createQueryBuilder('quotation')
      .withDeleted()
      .select(
        'quotation.quotation_number',
        'quotationNumber',
      )
      .where('quotation.company_id = :companyId', {
        companyId,
      })
      .andWhere(
        'quotation.quotation_number LIKE :prefix',
        { prefix: `${prefix}%` },
      )
      .orderBy('quotation.quotation_number', 'DESC')
      .getRawOne<{ quotationNumber?: string }>();

    const current = latest?.quotationNumber
      ? Number(latest.quotationNumber.replace(prefix, ''))
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

  private startOfTodayUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ),
    );
  }

  private toItemResponse(
    item: SalesQuotationItem,
  ): SalesQuotationItemResponseDto {
    return {
      id: item.id,
      itemId: item.itemId,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      taxPercent: Number(item.taxPercent),
      lineSubtotal: Number(item.lineSubtotal),
      discountAmount: Number(item.discountAmount),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
    };
  }

  private toResponse(
    quotation: SalesQuotation,
  ): SalesQuotationResponseDto {
    return {
      id: quotation.id,
      companyId: quotation.companyId,
      customerId: quotation.customerId,
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate,
      validUntil: quotation.validUntil,
      status: quotation.status,
      currency: quotation.currency,
      subtotal: Number(quotation.subtotal),
      discountTotal: Number(quotation.discountTotal),
      taxTotal: Number(quotation.taxTotal),
      shippingTotal: Number(quotation.shippingTotal),
      grandTotal: Number(quotation.grandTotal),
      customerReference: quotation.customerReference,
      terms: quotation.terms,
      notes: quotation.notes,
      items: (quotation.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: quotation.createdBy,
      updatedBy: quotation.updatedBy,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      deletedAt: quotation.deletedAt,
    };
  }
}
