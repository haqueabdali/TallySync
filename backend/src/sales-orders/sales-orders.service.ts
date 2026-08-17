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
import { SalesQuotationItem } from '../sales-quotations/entities/sales-quotation-item.entity';
import { SalesQuotation } from '../sales-quotations/entities/sales-quotation.entity';
import { SalesQuotationStatus } from '../sales-quotations/enums/sales-quotation-status.enum';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderFilterDto } from './dto/sales-order-filter.dto';
import {
  PaginatedSalesOrdersResponseDto,
  SalesOrderItemResponseDto,
  SalesOrderResponseDto,
} from './dto/sales-order-response.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderStatus } from './enums/sales-order-status.enum';

@Injectable()
export class SalesOrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,

    @InjectRepository(SalesOrderItemEntity)
    private readonly salesOrderItemRepository: Repository<SalesOrderItemEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,

    @InjectRepository(SalesQuotation)
    private readonly quotationRepository: Repository<SalesQuotation>,

    @InjectRepository(SalesQuotationItem)
    private readonly quotationItemRepository: Repository<SalesQuotationItem>,
  ) {}

  async create(
    dto: CreateSalesOrderDto,
    companyId: string,
    userId: string,
  ): Promise<SalesOrderResponseDto> {
    await this.validateReferences(dto, companyId);
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));

    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(SalesOrderEntity);
      const itemRepository = manager.getRepository(SalesOrderItemEntity);

      const order = orderRepository.create({
        companyId,
        customerId: dto.customerId,
        warehouseId: dto.warehouseId,
        salesQuotationId: dto.salesQuotationId ?? null,
        orderNumber: await this.generateOrderNumber(
          companyId,
          dto.orderDate,
        ),
        orderDate: dto.orderDate,
        expectedDeliveryDate: dto.expectedDeliveryDate ?? null,
        status: SalesOrderStatus.Draft,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: this.round(dto.shippingTotal ?? 0),
        grandTotal: 0,
        customerReference: this.optional(dto.customerReference),
        shippingAddress: this.optional(dto.shippingAddress),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        items: [],
      });

      const savedOrder = await orderRepository.save(order);

      savedOrder.items = dto.items.map((line) => {
        const totals = this.calculateLine(
          line.quantity,
          line.unitPrice,
          line.discountPercent ?? 0,
          line.taxPercent ?? 0,
        );

        return itemRepository.create({
          salesOrderId: savedOrder.id,
          itemId: line.itemId,
          salesQuotationItemId: line.salesQuotationItemId ?? null,
          description: this.optional(line.description),
          quantity: line.quantity,
          deliveredQuantity: 0,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent ?? 0,
          taxPercent: line.taxPercent ?? 0,
          ...totals,
        });
      });

      savedOrder.items = await itemRepository.save(savedOrder.items);
      this.calculateOrderTotals(savedOrder);

      return this.toResponse(
        await orderRepository.save(savedOrder),
      );
    });
  }

  async findAll(
    filter: SalesOrderFilterDto,
    companyId: string,
  ): Promise<PaginatedSalesOrdersResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .leftJoinAndSelect('salesOrder.items', 'items')
      .where('salesOrder.company_id = :companyId', { companyId });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('salesOrder.order_number ILIKE :search', { search })
            .orWhere(
              'salesOrder.customer_reference ILIKE :search',
              { search },
            )
            .orWhere('salesOrder.notes ILIKE :search', { search });
        }),
      );
    }

    if (filter.customerId) {
      query.andWhere('salesOrder.customer_id = :customerId', {
        customerId: filter.customerId,
      });
    }

    if (filter.warehouseId) {
      query.andWhere('salesOrder.warehouse_id = :warehouseId', {
        warehouseId: filter.warehouseId,
      });
    }

    if (filter.salesQuotationId) {
      query.andWhere(
        'salesOrder.sales_quotation_id = :salesQuotationId',
        { salesQuotationId: filter.salesQuotationId },
      );
    }

    if (filter.status) {
      query.andWhere('salesOrder.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere('salesOrder.order_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('salesOrder.order_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    const sortColumns: Record<string, string> = {
      orderNumber: 'salesOrder.order_number',
      orderDate: 'salesOrder.order_date',
      expectedDeliveryDate: 'salesOrder.expected_delivery_date',
      grandTotal: 'salesOrder.grand_total',
      createdAt: 'salesOrder.created_at',
      updatedAt: 'salesOrder.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'salesOrder.created_at',
        filter.sortOrder,
      )
      .addOrderBy('salesOrder.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [orders, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: orders.map((order) => this.toResponse(order)),
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
  ): Promise<SalesOrderResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateSalesOrderDto,
    companyId: string,
    userId: string,
  ): Promise<SalesOrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(SalesOrderEntity);
      const itemRepository = manager.getRepository(SalesOrderItemEntity);

      const order = await orderRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Sales order not found.');
      }

      this.ensureDraft(order);

      const mergedDto: CreateSalesOrderDto = {
        customerId: dto.customerId ?? order.customerId,
        warehouseId: dto.warehouseId ?? order.warehouseId,
        salesQuotationId:
          dto.salesQuotationId ?? order.salesQuotationId ?? undefined,
        orderDate: dto.orderDate ?? order.orderDate,
        expectedDeliveryDate:
          dto.expectedDeliveryDate ??
          order.expectedDeliveryDate ??
          undefined,
        currency: dto.currency ?? order.currency,
        shippingTotal:
          dto.shippingTotal ?? Number(order.shippingTotal),
        customerReference:
          dto.customerReference ??
          order.customerReference ??
          undefined,
        shippingAddress:
          dto.shippingAddress ?? order.shippingAddress ?? undefined,
        notes: dto.notes ?? order.notes ?? undefined,
        items:
          dto.items ??
          order.items.map((item) => ({
            itemId: item.itemId,
            salesQuotationItemId:
              item.salesQuotationItemId ?? undefined,
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
          salesOrderId: order.id,
        });

        order.items = dto.items.map((line) => {
          const totals = this.calculateLine(
            line.quantity,
            line.unitPrice,
            line.discountPercent ?? 0,
            line.taxPercent ?? 0,
          );

          return itemRepository.create({
            salesOrderId: order.id,
            itemId: line.itemId,
            salesQuotationItemId:
              line.salesQuotationItemId ?? null,
            description: this.optional(line.description),
            quantity: line.quantity,
            deliveredQuantity: 0,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            ...totals,
          });
        });

        order.items = await itemRepository.save(order.items);
      }

      if (dto.customerId !== undefined) {
        order.customerId = dto.customerId;
      }

      if (dto.warehouseId !== undefined) {
        order.warehouseId = dto.warehouseId;
      }

      if (dto.salesQuotationId !== undefined) {
        order.salesQuotationId = dto.salesQuotationId ?? null;
      }

      if (dto.orderDate !== undefined) {
        order.orderDate = dto.orderDate;
      }

      if (dto.expectedDeliveryDate !== undefined) {
        order.expectedDeliveryDate =
          dto.expectedDeliveryDate ?? null;
      }

      if (dto.currency !== undefined) {
        order.currency = dto.currency.toUpperCase();
      }

      if (dto.shippingTotal !== undefined) {
        order.shippingTotal = this.round(dto.shippingTotal);
      }

      if (dto.customerReference !== undefined) {
        order.customerReference = this.optional(
          dto.customerReference,
        );
      }

      if (dto.shippingAddress !== undefined) {
        order.shippingAddress = this.optional(dto.shippingAddress);
      }

      if (dto.notes !== undefined) {
        order.notes = this.optional(dto.notes);
      }

      order.updatedBy = userId;
      this.calculateOrderTotals(order);

      return this.toResponse(
        await orderRepository.save(order),
      );
    });
  }

  async confirm(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesOrderResponseDto> {
    const order = await this.getEntity(id, companyId);
    this.ensureDraft(order);

    if (!order.items.length) {
      throw new BadRequestException(
        'Sales order must contain at least one item.',
      );
    }

    order.status = SalesOrderStatus.Confirmed;
    order.updatedBy = userId;

    return this.toResponse(
      await this.salesOrderRepository.save(order),
    );
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesOrderResponseDto> {
    const order = await this.getEntity(id, companyId);

    if (
      order.status === SalesOrderStatus.Delivered ||
      order.status === SalesOrderStatus.PartiallyDelivered
    ) {
      throw new ConflictException(
        'A delivered or partially delivered sales order cannot be cancelled.',
      );
    }

    if (order.status === SalesOrderStatus.Cancelled) {
      return this.toResponse(order);
    }

    order.status = SalesOrderStatus.Cancelled;
    order.updatedBy = userId;

    return this.toResponse(
      await this.salesOrderRepository.save(order),
    );
  }

  async recalculateDeliveryStatus(
    id: string,
    companyId: string,
  ): Promise<SalesOrderResponseDto> {
    const order = await this.getEntity(id, companyId);

    const totalOrdered = order.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );
    const totalDelivered = order.items.reduce(
      (sum, item) => sum + Number(item.deliveredQuantity),
      0,
    );

    if (totalDelivered <= 0) {
      order.status = SalesOrderStatus.Confirmed;
    } else if (totalDelivered >= totalOrdered) {
      order.status = SalesOrderStatus.Delivered;
    } else {
      order.status = SalesOrderStatus.PartiallyDelivered;
    }

    return this.toResponse(
      await this.salesOrderRepository.save(order),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const order = await this.getEntity(id, companyId);
    this.ensureDraft(order);

    await this.salesOrderRepository.softRemove(order);

    return {
      message: 'Sales order deleted successfully.',
    };
  }

  private async validateReferences(
    dto: CreateSalesOrderDto,
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

    const warehouse = await this.warehouseRepository.findOne({
      where: {
        id: dto.warehouseId,
        companyId,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    if (
      dto.expectedDeliveryDate &&
      new Date(dto.expectedDeliveryDate).getTime() <
        new Date(dto.orderDate).getTime()
    ) {
      throw new BadRequestException(
        'Expected delivery date cannot be earlier than order date.',
      );
    }

    if (dto.salesQuotationId) {
      const quotation = await this.quotationRepository.findOne({
        where: {
          id: dto.salesQuotationId,
          companyId,
          customerId: dto.customerId,
        },
        relations: { items: true },
      });

      if (!quotation) {
        throw new NotFoundException(
          'Sales quotation not found.',
        );
      }

      if (quotation.status !== SalesQuotationStatus.Accepted) {
        throw new ConflictException(
          'Only accepted sales quotations can be converted to sales orders.',
        );
      }

      for (const line of dto.items) {
        if (!line.salesQuotationItemId) {
          continue;
        }

        const quotationItem = quotation.items.find(
          (item) => item.id === line.salesQuotationItemId,
        );

        if (!quotationItem) {
          throw new BadRequestException(
            `Sales quotation item ${line.salesQuotationItemId} is invalid.`,
          );
        }

        if (quotationItem.itemId !== line.itemId) {
          throw new BadRequestException(
            'Sales quotation item does not match the selected item.',
          );
        }

        if (Number(line.quantity) > Number(quotationItem.quantity)) {
          throw new BadRequestException(
            'Sales order quantity cannot exceed quotation quantity.',
          );
        }
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
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<SalesOrderEntity> {
    const order = await this.salesOrderRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found.');
    }

    return order;
  }

  private ensureDraft(order: SalesOrderEntity): void {
    if (order.status !== SalesOrderStatus.Draft) {
      throw new ConflictException(
        'Only draft sales orders can be modified.',
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
    SalesOrderItemEntity,
    | 'lineSubtotal'
    | 'lineDiscount'
    | 'lineTax'
    | 'discountAmount'
    | 'taxAmount'
    | 'lineTotal'
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

      // `lineDiscount` / `lineTax` are legacy persisted aliases that
      // still exist in the sales_order_items table and entity.
      // Keep them synchronized with the canonical amount fields.
      lineDiscount: discountAmount,
      lineTax: taxAmount,

      discountAmount,
      taxAmount,
      lineTotal,
    };
  }

  private calculateOrderTotals(order: SalesOrderEntity): void {
    order.subtotal = this.round(
      order.items.reduce(
        (sum, item) => sum + Number(item.lineSubtotal),
        0,
      ),
    );

    order.discountTotal = this.round(
      order.items.reduce(
        (sum, item) => sum + Number(item.discountAmount),
        0,
      ),
    );

    order.taxTotal = this.round(
      order.items.reduce(
        (sum, item) => sum + Number(item.taxAmount),
        0,
      ),
    );

    order.shippingTotal = this.round(
      Number(order.shippingTotal ?? 0),
    );

    order.grandTotal = this.round(
      order.subtotal -
        order.discountTotal +
        order.taxTotal +
        order.shippingTotal,
    );
  }

  private async generateOrderNumber(
    companyId: string,
    orderDate: string,
  ): Promise<string> {
    const year = new Date(orderDate).getUTCFullYear();
    const prefix = `SO-${year}-`;

    const latest = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .withDeleted()
      .select(
        'salesOrder.order_number',
        'orderNumber',
      )
      .where('salesOrder.company_id = :companyId', {
        companyId,
      })
      .andWhere(
        'salesOrder.order_number LIKE :prefix',
        { prefix: `${prefix}%` },
      )
      .orderBy('salesOrder.order_number', 'DESC')
      .getRawOne<{ orderNumber?: string }>();

    const current = latest?.orderNumber
      ? Number(latest.orderNumber.replace(prefix, ''))
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
    item: SalesOrderItemEntity,
  ): SalesOrderItemResponseDto {
    return {
      id: item.id,
      itemId: item.itemId,
      salesQuotationItemId: item.salesQuotationItemId,
      description: item.description,
      quantity: Number(item.quantity),
      deliveredQuantity: Number(item.deliveredQuantity),
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
    order: SalesOrderEntity,
  ): SalesOrderResponseDto {
    return {
      id: order.id,
      companyId: order.companyId,
      customerId: order.customerId,
      warehouseId: order.warehouseId,
      salesQuotationId: order.salesQuotationId,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      status: order.status,
      currency: order.currency,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      taxTotal: Number(order.taxTotal),
      shippingTotal: Number(order.shippingTotal),
      grandTotal: Number(order.grandTotal),
      customerReference: order.customerReference,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      items: (order.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: order.createdBy,
      updatedBy: order.updatedBy,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deletedAt: order.deletedAt,
    };
  }
}
