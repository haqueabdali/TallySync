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
import { DeliveryNoteItemEntity } from '../delivery-notes/entities/delivery-note-item.entity';
import { DeliveryNoteEntity } from '../delivery-notes/entities/delivery-note.entity';
import { DeliveryNoteStatus } from '../delivery-notes/enums/delivery-note-status.enum';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { SalesInvoiceFilterDto } from './dto/sales-invoice-filter.dto';
import {
  PaginatedSalesInvoicesResponseDto,
  SalesInvoiceItemResponseDto,
  SalesInvoiceResponseDto,
} from './dto/sales-invoice-response.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import { SalesInvoiceItemEntity } from './entities/sales-invoice-item.entity';
import { SalesInvoiceEntity } from './entities/sales-invoice.entity';
import { SalesInvoiceStatus } from './enums/sales-invoice-status.enum';

@Injectable()
export class SalesInvoicesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,

    @InjectRepository(SalesInvoiceItemEntity)
    private readonly salesInvoiceItemRepository: Repository<SalesInvoiceItemEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,

    @InjectRepository(SalesOrderItemEntity)
    private readonly salesOrderItemRepository: Repository<SalesOrderItemEntity>,

    @InjectRepository(DeliveryNoteEntity)
    private readonly deliveryNoteRepository: Repository<DeliveryNoteEntity>,

    @InjectRepository(DeliveryNoteItemEntity)
    private readonly deliveryNoteItemRepository: Repository<DeliveryNoteItemEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async create(
    dto: CreateSalesInvoiceDto,
    companyId: string,
    userId: string,
  ): Promise<SalesInvoiceResponseDto> {
    await this.validateReferences(dto, companyId);
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));

    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(SalesInvoiceEntity);
      const invoiceItemRepository =
        manager.getRepository(SalesInvoiceItemEntity);

      const invoice = invoiceRepository.create({
        companyId,
        customerId: dto.customerId,
        salesOrderId: dto.salesOrderId ?? null,
        deliveryNoteId: dto.deliveryNoteId ?? null,
        invoiceNumber: await this.generateInvoiceNumber(
          companyId,
          dto.invoiceDate,
        ),
        customerInvoiceReference: this.optional(
          dto.customerInvoiceReference,
        ),
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate ?? null,
        status: SalesInvoiceStatus.DRAFT,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: this.round(dto.shippingTotal ?? 0),
        grandTotal: 0,
        paidAmount: 0,
        balanceDue: 0,
        billingAddress: this.optional(dto.billingAddress),
        shippingAddress: this.optional(dto.shippingAddress),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        cancelledBy: null,
        cancelledAt: null,
        items: [],
      });

      const savedInvoice = await invoiceRepository.save(invoice);

      savedInvoice.items = dto.items.map((line) => {
        const totals = this.calculateLine(
          line.quantity,
          line.unitPrice,
          line.discountPercent ?? 0,
          line.taxPercent ?? 0,
        );

        return invoiceItemRepository.create({
          salesInvoiceId: savedInvoice.id,
          itemId: line.itemId,
          salesOrderItemId: line.salesOrderItemId ?? null,
          deliveryNoteItemId: line.deliveryNoteItemId ?? null,
          itemName: this.optional(line.itemName),
          sku: this.optional(line.sku),
          unit: this.optional(line.unit),
          description: this.optional(line.description),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent ?? 0,
          taxPercent: line.taxPercent ?? 0,
          ...totals,
        });
      });

      savedInvoice.items = await invoiceItemRepository.save(
        savedInvoice.items,
      );

      this.calculateInvoiceTotals(savedInvoice);

      return this.toResponse(
        await invoiceRepository.save(savedInvoice),
      );
    });
  }

  async findAll(
    filter: SalesInvoiceFilterDto,
    companyId: string,
  ): Promise<PaginatedSalesInvoicesResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.salesInvoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.company_id = :companyId', { companyId });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('invoice.invoice_number ILIKE :search', {
            search,
          })
            .orWhere(
              'invoice.customer_invoice_reference ILIKE :search',
              { search },
            )
            .orWhere('invoice.notes ILIKE :search', { search });
        }),
      );
    }

    if (filter.customerId) {
      query.andWhere('invoice.customer_id = :customerId', {
        customerId: filter.customerId,
      });
    }

    if (filter.salesOrderId) {
      query.andWhere('invoice.sales_order_id = :salesOrderId', {
        salesOrderId: filter.salesOrderId,
      });
    }

    if (filter.deliveryNoteId) {
      query.andWhere(
        'invoice.delivery_note_id = :deliveryNoteId',
        { deliveryNoteId: filter.deliveryNoteId },
      );
    }

    if (filter.status) {
      query.andWhere('invoice.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere('invoice.invoice_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('invoice.invoice_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    if (filter.dueDateFrom) {
      query.andWhere('invoice.due_date >= :dueDateFrom', {
        dueDateFrom: filter.dueDateFrom,
      });
    }

    if (filter.dueDateTo) {
      query.andWhere('invoice.due_date <= :dueDateTo', {
        dueDateTo: filter.dueDateTo,
      });
    }

    const sortColumns: Record<string, string> = {
      invoiceNumber: 'invoice.invoice_number',
      invoiceDate: 'invoice.invoice_date',
      dueDate: 'invoice.due_date',
      grandTotal: 'invoice.grand_total',
      balanceDue: 'invoice.balance_due',
      createdAt: 'invoice.created_at',
      updatedAt: 'invoice.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'invoice.created_at',
        filter.sortOrder,
      )
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [invoices, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: invoices.map((invoice) => this.toResponse(invoice)),
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
  ): Promise<SalesInvoiceResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateSalesInvoiceDto,
    companyId: string,
    userId: string,
  ): Promise<SalesInvoiceResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(SalesInvoiceEntity);
      const invoiceItemRepository =
        manager.getRepository(SalesInvoiceItemEntity);

      const invoice = await invoiceRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      this.ensureDraft(invoice);

      const mergedDto: CreateSalesInvoiceDto = {
        customerId: dto.customerId ?? invoice.customerId,
        salesOrderId:
          dto.salesOrderId ?? invoice.salesOrderId ?? undefined,
        deliveryNoteId:
          dto.deliveryNoteId ?? invoice.deliveryNoteId ?? undefined,
        invoiceDate: dto.invoiceDate ?? invoice.invoiceDate,
        dueDate: dto.dueDate ?? invoice.dueDate ?? undefined,
        currency: dto.currency ?? invoice.currency,
        shippingTotal:
          dto.shippingTotal ?? Number(invoice.shippingTotal),
        customerInvoiceReference:
          dto.customerInvoiceReference ??
          invoice.customerInvoiceReference ??
          undefined,
        billingAddress:
          dto.billingAddress ?? invoice.billingAddress ?? undefined,
        shippingAddress:
          dto.shippingAddress ?? invoice.shippingAddress ?? undefined,
        notes: dto.notes ?? invoice.notes ?? undefined,
        items:
          dto.items ??
          invoice.items.map((item) => ({
            itemId: item.itemId,
            salesOrderItemId: item.salesOrderItemId ?? undefined,
            deliveryNoteItemId:
              item.deliveryNoteItemId ?? undefined,
            itemName: item.itemName ?? undefined,
            sku: item.sku ?? undefined,
            unit: item.unit ?? undefined,
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

        await invoiceItemRepository.delete({
          salesInvoiceId: invoice.id,
        });

        invoice.items = dto.items.map((line) => {
          const totals = this.calculateLine(
            line.quantity,
            line.unitPrice,
            line.discountPercent ?? 0,
            line.taxPercent ?? 0,
          );

          return invoiceItemRepository.create({
            salesInvoiceId: invoice.id,
            itemId: line.itemId,
            salesOrderItemId: line.salesOrderItemId ?? null,
            deliveryNoteItemId: line.deliveryNoteItemId ?? null,
            itemName: this.optional(line.itemName),
            sku: this.optional(line.sku),
            unit: this.optional(line.unit),
            description: this.optional(line.description),
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            ...totals,
          });
        });

        invoice.items = await invoiceItemRepository.save(
          invoice.items,
        );
      }

      if (dto.customerId !== undefined) {
        invoice.customerId = dto.customerId;
      }

      if (dto.salesOrderId !== undefined) {
        invoice.salesOrderId = dto.salesOrderId ?? null;
      }

      if (dto.deliveryNoteId !== undefined) {
        invoice.deliveryNoteId = dto.deliveryNoteId ?? null;
      }

      if (dto.invoiceDate !== undefined) {
        invoice.invoiceDate = dto.invoiceDate;
      }

      if (dto.dueDate !== undefined) {
        invoice.dueDate = dto.dueDate ?? null;
      }

      if (dto.currency !== undefined) {
        invoice.currency = dto.currency.toUpperCase();
      }

      if (dto.shippingTotal !== undefined) {
        invoice.shippingTotal = this.round(dto.shippingTotal);
      }

      if (dto.customerInvoiceReference !== undefined) {
        invoice.customerInvoiceReference = this.optional(
          dto.customerInvoiceReference,
        );
      }

      if (dto.billingAddress !== undefined) {
        invoice.billingAddress = this.optional(dto.billingAddress);
      }

      if (dto.shippingAddress !== undefined) {
        invoice.shippingAddress = this.optional(
          dto.shippingAddress,
        );
      }

      if (dto.notes !== undefined) {
        invoice.notes = this.optional(dto.notes);
      }

      invoice.updatedBy = userId;
      this.calculateInvoiceTotals(invoice);

      return this.toResponse(
        await invoiceRepository.save(invoice),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesInvoiceResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(SalesInvoiceEntity);
      const customerRepository = manager.getRepository(CustomerEntity);

      const invoice = await invoiceRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      this.ensureDraft(invoice);

      if (!invoice.items.length) {
        throw new BadRequestException(
          'Sales invoice must contain at least one item.',
        );
      }

      const customer = await customerRepository.findOne({
        where: {
          id: invoice.customerId,
          companyId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found.');
      }

      invoice.balanceDue = this.round(
        Number(invoice.grandTotal) - Number(invoice.paidAmount),
      );

      invoice.status =
        invoice.balanceDue === 0
          ? SalesInvoiceStatus.PAID
          : invoice.paidAmount > 0
            ? SalesInvoiceStatus.PARTIALLY_PAID
            : SalesInvoiceStatus.POSTED;

      invoice.postedBy = userId;
      invoice.postedAt = new Date();
      invoice.updatedBy = userId;

      if ('currentBalance' in customer) {
        const currentBalance = Number(
          (customer as CustomerEntity & {
            currentBalance?: number | string | null;
          }).currentBalance ?? 0,
        );

        (
          customer as CustomerEntity & {
            currentBalance: number;
          }
        ).currentBalance = this.round(
          currentBalance + Number(invoice.balanceDue),
        );

        await customerRepository.save(customer);
      }

      return this.toResponse(
        await invoiceRepository.save(invoice),
      );
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesInvoiceResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(SalesInvoiceEntity);
      const customerRepository = manager.getRepository(CustomerEntity);

      const invoice = await invoiceRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      if (invoice.status === SalesInvoiceStatus.CANCELLED) {
        return this.toResponse(invoice);
      }

      if (Number(invoice.paidAmount) > 0) {
        throw new ConflictException(
          'A sales invoice with payments cannot be cancelled.',
        );
      }

      if (
        invoice.status === SalesInvoiceStatus.POSTED ||
        invoice.status === SalesInvoiceStatus.PARTIALLY_PAID ||
        invoice.status === SalesInvoiceStatus.PAID
      ) {
        const customer = await customerRepository.findOne({
          where: {
            id: invoice.customerId,
            companyId,
          },
        });

        if (!customer) {
          throw new NotFoundException('Customer not found.');
        }

        if ('currentBalance' in customer) {
          const currentBalance = Number(
            (customer as CustomerEntity & {
              currentBalance?: number | string | null;
            }).currentBalance ?? 0,
          );

          (
            customer as CustomerEntity & {
              currentBalance: number;
            }
          ).currentBalance = this.round(
            currentBalance - Number(invoice.balanceDue),
          );

          await customerRepository.save(customer);
        }
      }

      invoice.status = SalesInvoiceStatus.CANCELLED;
      invoice.cancelledBy = userId;
      invoice.cancelledAt = new Date();
      invoice.updatedBy = userId;

      return this.toResponse(
        await invoiceRepository.save(invoice),
      );
    });
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const invoice = await this.getEntity(id, companyId);
    this.ensureDraft(invoice);

    await this.salesInvoiceRepository.softRemove(invoice);

    return {
      message: 'Sales invoice deleted successfully.',
    };
  }

  private async validateReferences(
    dto: CreateSalesInvoiceDto,
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
      dto.dueDate &&
      new Date(dto.dueDate).getTime() <
        new Date(dto.invoiceDate).getTime()
    ) {
      throw new BadRequestException(
        'Due date cannot be earlier than invoice date.',
      );
    }

    let salesOrder: SalesOrderEntity | null = null;
    let deliveryNote: DeliveryNoteEntity | null = null;

    if (dto.salesOrderId) {
      salesOrder = await this.salesOrderRepository.findOne({
        where: {
          id: dto.salesOrderId,
          companyId,
          customerId: dto.customerId,
        },
        relations: { items: true },
      });

      if (!salesOrder) {
        throw new NotFoundException('Sales order not found.');
      }
    }

    if (dto.deliveryNoteId) {
      deliveryNote = await this.deliveryNoteRepository.findOne({
        where: {
          id: dto.deliveryNoteId,
          companyId,
          customerId: dto.customerId,
        },
        relations: { items: true },
      });

      if (!deliveryNote) {
        throw new NotFoundException('Delivery note not found.');
      }

      if (deliveryNote.status !== DeliveryNoteStatus.POSTED) {
        throw new ConflictException(
          'Only posted delivery notes can be invoiced.',
        );
      }

      if (
        dto.salesOrderId &&
        deliveryNote.salesOrderId !== dto.salesOrderId
      ) {
        throw new BadRequestException(
          'Delivery note does not belong to the selected sales order.',
        );
      }
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

      if (line.salesOrderItemId) {
        const orderItem =
          await this.salesOrderItemRepository.findOne({
            where: {
              id: line.salesOrderItemId,
              itemId: line.itemId,
            },
          });

        if (!orderItem) {
          throw new BadRequestException(
            `Sales order item ${line.salesOrderItemId} is invalid.`,
          );
        }

        if (
          salesOrder &&
          orderItem.salesOrderId !== salesOrder.id
        ) {
          throw new BadRequestException(
            'Sales order item does not belong to the selected sales order.',
          );
        }

        if (Number(line.quantity) > Number(orderItem.quantity)) {
          throw new BadRequestException(
            `Invoice quantity exceeds sales order quantity for item ${line.itemId}.`,
          );
        }
      }

      if (line.deliveryNoteItemId) {
        const deliveryItem =
          await this.deliveryNoteItemRepository.findOne({
            where: {
              id: line.deliveryNoteItemId,
              itemId: line.itemId,
            },
          });

        if (!deliveryItem) {
          throw new BadRequestException(
            `Delivery note item ${line.deliveryNoteItemId} is invalid.`,
          );
        }

        if (
          deliveryNote &&
          deliveryItem.deliveryNoteId !== deliveryNote.id
        ) {
          throw new BadRequestException(
            'Delivery note item does not belong to the selected delivery note.',
          );
        }

        if (
          Number(line.quantity) >
          Number(deliveryItem.deliveredQuantity)
        ) {
          throw new BadRequestException(
            `Invoice quantity exceeds delivered quantity for item ${line.itemId}.`,
          );
        }
      }
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<SalesInvoiceEntity> {
    const invoice = await this.salesInvoiceRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Sales invoice not found.');
    }

    return invoice;
  }

  private ensureDraft(invoice: SalesInvoiceEntity): void {
    if (invoice.status !== SalesInvoiceStatus.DRAFT) {
      throw new ConflictException(
        'Only draft sales invoices can be modified.',
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
    SalesInvoiceItemEntity,
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
    const lineTotal = this.round(taxableAmount + taxAmount);

    return {
      lineSubtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  }

  private calculateInvoiceTotals(
    invoice: SalesInvoiceEntity,
  ): void {
    invoice.subtotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.lineSubtotal),
        0,
      ),
    );

    invoice.discountTotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.discountAmount),
        0,
      ),
    );

    invoice.taxTotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.taxAmount),
        0,
      ),
    );

    invoice.shippingTotal = this.round(
      Number(invoice.shippingTotal ?? 0),
    );

    invoice.grandTotal = this.round(
      invoice.subtotal -
        invoice.discountTotal +
        invoice.taxTotal +
        invoice.shippingTotal,
    );

    invoice.balanceDue = this.round(
      invoice.grandTotal - Number(invoice.paidAmount ?? 0),
    );
  }

  private async generateInvoiceNumber(
    companyId: string,
    invoiceDate: string,
  ): Promise<string> {
    const year = new Date(invoiceDate).getUTCFullYear();
    const prefix = `SI-${year}-`;

    const latest = await this.salesInvoiceRepository
      .createQueryBuilder('invoice')
      .withDeleted()
      .select('invoice.invoice_number', 'invoiceNumber')
      .where('invoice.company_id = :companyId', {
        companyId,
      })
      .andWhere('invoice.invoice_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('invoice.invoice_number', 'DESC')
      .getRawOne<{ invoiceNumber?: string }>();

    const current = latest?.invoiceNumber
      ? Number(latest.invoiceNumber.replace(prefix, ''))
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

  private toItemResponse(
    item: SalesInvoiceItemEntity,
  ): SalesInvoiceItemResponseDto {
    return {
      id: item.id,
      itemId: item.itemId,
      salesOrderItemId: item.salesOrderItemId,
      deliveryNoteItemId: item.deliveryNoteItemId,
      itemName: item.itemName,
      sku: item.sku,
      unit: item.unit,
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
    invoice: SalesInvoiceEntity,
  ): SalesInvoiceResponseDto {
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      salesOrderId: invoice.salesOrderId,
      deliveryNoteId: invoice.deliveryNoteId,
      invoiceNumber: invoice.invoiceNumber,
      customerInvoiceReference:
        invoice.customerInvoiceReference,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      discountTotal: Number(invoice.discountTotal),
      taxTotal: Number(invoice.taxTotal),
      shippingTotal: Number(invoice.shippingTotal),
      grandTotal: Number(invoice.grandTotal),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.balanceDue),
      billingAddress: invoice.billingAddress,
      shippingAddress: invoice.shippingAddress,
      notes: invoice.notes,
      items: (invoice.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: invoice.createdBy,
      updatedBy: invoice.updatedBy,
      postedBy: invoice.postedBy,
      postedAt: invoice.postedAt,
      cancelledBy: invoice.cancelledBy,
      cancelledAt: invoice.cancelledAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      deletedAt: invoice.deletedAt,
    };
  }
}
