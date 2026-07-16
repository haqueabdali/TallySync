import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Brackets, DataSource, In, IsNull, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';

import {
  ItemEntity,
  InventorySyncStatus,
} from '../inventory/entities/item.entity';
import { CustomerEntity } from './entities/customer.entity';
import {
  SalesOrderEntity,
  SalesOrderStatus,
  SalesOrderSyncStatus,
} from './entities/sales-order.entity';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import type { OrderItemDto } from './dto/order-item.dto';

import { ListSalesOrdersQueryDto } from './dto/list-sales-orders-query.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
  PaginatedSalesOrdersResponseDto,
  SalesOrderResponseDto,
  SalesOrderSummaryResponseDto,
} from './dto/sales-order-response.dto';

import type { SalesRequestContext } from './interfaces/sales-request-context.interface';

interface CalculatedOrderLine {
  item: ItemEntity;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTax: number;
  lineTotal: number;
}

interface CalculatedOrderTotals {
  lines: CalculatedOrderLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  /**
   * Temporary approval threshold.
   * Later move this to company configuration.
   */
  private readonly approvalThreshold = 100000;

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,

    @InjectRepository(SalesOrderItemEntity)
    private readonly salesOrderItemRepository: Repository<SalesOrderItemEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // CUSTOMER MANAGEMENT
  // ==========================================================================

  async createCustomer(
    dto: CreateCustomerDto,
    context: SalesRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);

    const name = this.normalizeRequiredText(dto.name, 'Customer name');

    const email = this.normalizeEmail(dto.email);

    if (email) {
      await this.ensureCustomerEmailAvailable(companyId, email);
    }

    const customer = this.customerRepository.create({
      companyId,
      name,
      email,
      phone: this.normalizeNullableText(dto.phone),
      address: this.normalizeNullableText(dto.address),
      tallyLedgerName: this.normalizeNullableText(dto.tallyLedgerName),
      creditLimit: this.ensureNonNegativeNumber(
        dto.creditLimit ?? 0,
        'Credit limit',
      ),
      isActive: dto.isActive ?? true,
    });

    const savedCustomer = await this.customerRepository.save(customer);

    this.logger.log(
      `Customer ${savedCustomer.id} created by ${
        context.actorId ?? 'unknown actor'
      }`,
    );

    return this.toCustomerResponse(savedCustomer);
  }

  async listCustomers(
    query: ListCustomersQueryDto,
    context: SalesRequestContext,
  ): Promise<PaginatedCustomersResponseDto> {
    const companyId = this.requireCompanyId(context);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', {
        companyId,
      })
      .andWhere('customer.deletedAt IS NULL');

    const search = query.search?.trim();

    if (search) {
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where(
              `LOWER(customer.name)
               LIKE LOWER(:search)`,
              {
                search: `%${search}%`,
              },
            )
            .orWhere(
              `LOWER(
                COALESCE(customer.email, '')
              ) LIKE LOWER(:search)`,
              {
                search: `%${search}%`,
              },
            )
            .orWhere(
              `LOWER(
                COALESCE(customer.phone, '')
              ) LIKE LOWER(:search)`,
              {
                search: `%${search}%`,
              },
            )
            .orWhere(
              `LOWER(
                COALESCE(
                  customer.tallyLedgerName,
                  ''
                )
              ) LIKE LOWER(:search)`,
              {
                search: `%${search}%`,
              },
            );
        }),
      );
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('customer.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    const allowedSortColumns: Record<string, string> = {
      createdAt: 'customer.createdAt',
      updatedAt: 'customer.updatedAt',
      name: 'customer.name',
      email: 'customer.email',
      creditLimit: 'customer.creditLimit',
    };

    const sortColumn =
      allowedSortColumns[query.sortBy ?? 'name'] ?? 'customer.name';

    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const [customers, total] = await queryBuilder
      .orderBy(sortColumn, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: customers.map((customer) => this.toCustomerResponse(customer)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getCustomerById(
    customerId: string,
    context: SalesRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);

    const customer = await this.findCustomerEntity(customerId, companyId);

    return this.toCustomerResponse(customer);
  }

  async updateCustomer(
    customerId: string,
    dto: UpdateCustomerDto,
    context: SalesRequestContext,
  ): Promise<CustomerResponseDto> {
    const companyId = this.requireCompanyId(context);

    const customer = await this.findCustomerEntity(customerId, companyId);

    if (dto.name !== undefined) {
      customer.name = this.normalizeRequiredText(dto.name, 'Customer name');
    }

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);

      if (email && email !== customer.email) {
        await this.ensureCustomerEmailAvailable(companyId, email, customer.id);
      }

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

    if (dto.isActive !== undefined) {
      customer.isActive = dto.isActive;
    }

    const savedCustomer = await this.customerRepository.save(customer);

    this.logger.log(
      `Customer ${savedCustomer.id} updated by ${
        context.actorId ?? 'unknown actor'
      }`,
    );

    return this.toCustomerResponse(savedCustomer);
  }

  async deleteCustomer(
    customerId: string,
    context: SalesRequestContext,
  ): Promise<void> {
    const companyId = this.requireCompanyId(context);

    const customer = await this.findCustomerEntity(customerId, companyId);

    const linkedOrderCount = await this.salesOrderRepository.count({
      where: {
        companyId,
        customerId,
        deletedAt: IsNull(),
      },
    });

    if (linkedOrderCount > 0) {
      throw new BadRequestException(
        'Customer cannot be deleted because sales orders are linked to this customer',
      );
    }

    await this.customerRepository.softRemove(customer);

    this.logger.log(
      `Customer ${customer.id} deleted by ${
        context.actorId ?? 'unknown actor'
      }`,
    );
  }

  // ==========================================================================
  // SALES ORDER CREATION
  // ==========================================================================

  async createSalesOrder(
    dto: CreateSalesOrderDto,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);

    const actorId = this.requireActorId(context);

    this.validateOrderDates(dto.orderDate, dto.expectedDeliveryDate);

    return this.dataSource.transaction(
      async (entityManager: EntityManager): Promise<SalesOrderResponseDto> => {
        const customerRepository = entityManager.getRepository(CustomerEntity);

        const orderRepository = entityManager.getRepository(SalesOrderEntity);

        const orderItemRepository =
          entityManager.getRepository(SalesOrderItemEntity);

        const itemRepository = entityManager.getRepository(ItemEntity);

        const customer = await customerRepository.findOne({
          where: {
            id: dto.customerId,
            companyId,
            isActive: true,
            deletedAt: IsNull(),
          },
        });

        if (!customer) {
          throw new NotFoundException('Active customer not found');
        }

        const calculated = await this.calculateOrderLines(
          dto.items,
          companyId,
          itemRepository,
        );

        const orderNumber = await this.generateUniqueOrderNumber(
          companyId,
          orderRepository,
        );

        const approvalRequired =
          calculated.grandTotal >= this.approvalThreshold;

        const order = orderRepository.create({
          companyId,
          customerId: customer.id,
          createdBy: actorId,
          orderNumber,
          orderDate: dto.orderDate,
          expectedDeliveryDate: dto.expectedDeliveryDate ?? null,
          status: SalesOrderStatus.DRAFT,
          subtotal: calculated.subtotal,
          discountTotal: calculated.discountTotal,
          taxTotal: calculated.taxTotal,
          grandTotal: calculated.grandTotal,
          notes: this.normalizeNullableText(dto.notes),
          approvalRequired,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null,
          syncStatus: SalesOrderSyncStatus.PENDING,
          lastSyncedAt: null,
        });

        const savedOrder = await orderRepository.save(order);

        const orderItems = calculated.lines.map((line) =>
          orderItemRepository.create({
            salesOrderId: savedOrder.id,
            itemId: line.item.id,
            itemName: line.item.name,
            sku: line.item.sku,
            quantity: line.quantity,
            unit: line.item.unit,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            taxPercent: line.taxPercent,
            lineSubtotal: line.lineSubtotal,
            lineDiscount: line.lineDiscount,
            lineTax: line.lineTax,
            lineTotal: line.lineTotal,
          }),
        );

        await orderItemRepository.save(orderItems);

        const createdOrder = await orderRepository.findOne({
          where: {
            id: savedOrder.id,
            companyId,
          },
          relations: {
            customer: true,
            items: true,
          },
        });

        if (!createdOrder) {
          throw new NotFoundException(
            'Created sales order could not be loaded',
          );
        }

        this.logger.log(
          `Sales order ${createdOrder.orderNumber} created by ${actorId}`,
        );

        return this.toSalesOrderResponse(createdOrder);
      },
    );
  }

  async listSalesOrders(
    query: ListSalesOrdersQueryDto,
    context: SalesRequestContext,
  ): Promise<PaginatedSalesOrdersResponseDto> {
    const companyId = this.requireCompanyId(context);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.salesOrderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.companyId = :companyId', {
        companyId,
      })
      .andWhere('order.deletedAt IS NULL');

    const search = query.search?.trim();

    if (search) {
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where('LOWER(order.orderNumber) LIKE LOWER(:search)', {
              search: `%${search}%`,
            })
            .orWhere('LOWER(customer.name) LIKE LOWER(:search)', {
              search: `%${search}%`,
            })
            .orWhere(
              `LOWER(COALESCE(customer.email, ''))
             LIKE LOWER(:search)`,
              {
                search: `%${search}%`,
              },
            );
        }),
      );
    }

    if (query.customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.createdBy) {
      queryBuilder.andWhere('order.createdBy = :createdBy', {
        createdBy: query.createdBy,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('order.status = :status', {
        status: query.status,
      });
    }

    if (query.syncStatus) {
      queryBuilder.andWhere('order.syncStatus = :syncStatus', {
        syncStatus: query.syncStatus,
      });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('order.orderDate >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('order.orderDate <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    const allowedSortColumns: Record<string, string> = {
      createdAt: 'order.createdAt',
      updatedAt: 'order.updatedAt',
      orderDate: 'order.orderDate',
      orderNumber: 'order.orderNumber',
      grandTotal: 'order.grandTotal',
      status: 'order.status',
    };

    const sortColumn =
      allowedSortColumns[query.sortBy ?? 'createdAt'] ?? 'order.createdAt';

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const [orders, total] = await queryBuilder
      .orderBy(sortColumn, sortOrder)
      .addOrderBy('items.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders.map((order) => this.toSalesOrderResponse(order)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }
  async getSalesOrderById(
    orderId: string,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);

    const order = await this.findSalesOrderEntity(orderId, companyId);

    return this.toSalesOrderResponse(order);
  }
  async updateSalesOrder(
    orderId: string,
    dto: UpdateSalesOrderDto,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);

    return this.dataSource.transaction(
      async (entityManager: EntityManager): Promise<SalesOrderResponseDto> => {
        const orderRepository = entityManager.getRepository(SalesOrderEntity);

        const customerRepository = entityManager.getRepository(CustomerEntity);

        const orderItemRepository =
          entityManager.getRepository(SalesOrderItemEntity);

        const itemRepository = entityManager.getRepository(ItemEntity);

        const order = await orderRepository.findOne({
          where: {
            id: orderId,
            companyId,
            deletedAt: IsNull(),
          },
          relations: {
            customer: true,
            items: true,
          },
        });

        if (!order) {
          throw new NotFoundException('Sales order not found');
        }

        if (
          order.status !== SalesOrderStatus.DRAFT &&
          order.status !== SalesOrderStatus.REJECTED
        ) {
          throw new BadRequestException(
            'Only draft or rejected sales orders can be edited',
          );
        }

        if (dto.customerId !== undefined) {
          const customer = await customerRepository.findOne({
            where: {
              id: dto.customerId,
              companyId,
              isActive: true,
              deletedAt: IsNull(),
            },
          });

          if (!customer) {
            throw new NotFoundException('Active customer not found');
          }

          order.customerId = customer.id;
          order.customer = customer;
        }

        const orderDate = dto.orderDate ?? order.orderDate;

        const expectedDeliveryDate =
          dto.expectedDeliveryDate === undefined
            ? order.expectedDeliveryDate
            : dto.expectedDeliveryDate;

        this.validateOrderDates(orderDate, expectedDeliveryDate);

        order.orderDate = orderDate;
        order.expectedDeliveryDate = expectedDeliveryDate;

        if (dto.notes !== undefined) {
          order.notes = this.normalizeNullableText(dto.notes);
        }

        if (dto.items !== undefined) {
          const calculated = await this.calculateOrderLines(
            dto.items,
            companyId,
            itemRepository,
          );

          await orderItemRepository.delete({
            salesOrderId: order.id,
          });

          const newOrderItems = calculated.lines.map((line) =>
            orderItemRepository.create({
              salesOrderId: order.id,
              itemId: line.item.id,
              itemName: line.item.name,
              sku: line.item.sku,
              quantity: line.quantity,
              unit: line.item.unit,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              taxPercent: line.taxPercent,
              lineSubtotal: line.lineSubtotal,
              lineDiscount: line.lineDiscount,
              lineTax: line.lineTax,
              lineTotal: line.lineTotal,
            }),
          );

          await orderItemRepository.save(newOrderItems);

          order.subtotal = calculated.subtotal;
          order.discountTotal = calculated.discountTotal;
          order.taxTotal = calculated.taxTotal;
          order.grandTotal = calculated.grandTotal;
          order.approvalRequired =
            calculated.grandTotal >= this.approvalThreshold;
        }

        order.status = SalesOrderStatus.DRAFT;
        order.approvedBy = null;
        order.approvedAt = null;
        order.rejectionReason = null;
        order.syncStatus = SalesOrderSyncStatus.PENDING;
        order.lastSyncedAt = null;

        await orderRepository.save(order);

        const updatedOrder = await orderRepository.findOne({
          where: {
            id: order.id,
            companyId,
          },
          relations: {
            customer: true,
            items: true,
          },
        });

        if (!updatedOrder) {
          throw new NotFoundException(
            'Updated sales order could not be loaded',
          );
        }

        this.logger.log(
          `Sales order ${order.orderNumber} updated by ${
            context.actorId ?? 'unknown actor'
          }`,
        );

        return this.toSalesOrderResponse(updatedOrder);
      },
    );
  }

  async submitSalesOrder(
    orderId: string,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);

    const order = await this.findSalesOrderEntity(orderId, companyId);

    if (
      order.status !== SalesOrderStatus.DRAFT &&
      order.status !== SalesOrderStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only draft or rejected sales orders can be submitted',
      );
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(
        'A sales order must contain at least one item',
      );
    }

    await this.validateCurrentStockForOrder(order.items, companyId);

    order.status = order.approvalRequired
      ? SalesOrderStatus.SUBMITTED
      : SalesOrderStatus.APPROVED;

    if (!order.approvalRequired) {
      order.approvedBy = context.actorId ?? null;
      order.approvedAt = new Date();
    }

    order.rejectionReason = null;
    order.syncStatus = SalesOrderSyncStatus.PENDING;
    order.lastSyncedAt = null;

    await this.salesOrderRepository.save(order);

    const submittedOrder = await this.findSalesOrderEntity(order.id, companyId);

    this.logger.log(
      `Sales order ${order.orderNumber} submitted by ${
        context.actorId ?? 'unknown actor'
      }`,
    );

    return this.toSalesOrderResponse(submittedOrder);
  }
  async approveSalesOrder(
    orderId: string,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);
    const actorId = this.requireActorId(context);

    const order = await this.findSalesOrderEntity(orderId, companyId);

    if (order.status !== SalesOrderStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only submitted sales orders can be approved',
      );
    }

    await this.validateCurrentStockForOrder(order.items, companyId);

    order.status = SalesOrderStatus.APPROVED;
    order.approvedBy = actorId;
    order.approvedAt = new Date();
    order.rejectionReason = null;
    order.syncStatus = SalesOrderSyncStatus.PENDING;
    order.lastSyncedAt = null;

    await this.salesOrderRepository.save(order);

    const approvedOrder = await this.findSalesOrderEntity(order.id, companyId);

    this.logger.log(`Sales order ${order.orderNumber} approved by ${actorId}`);

    return this.toSalesOrderResponse(approvedOrder);
  }
  async rejectSalesOrder(
    orderId: string,
    reason: string,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);
    const actorId = this.requireActorId(context);

    const order = await this.findSalesOrderEntity(orderId, companyId);

    if (order.status !== SalesOrderStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only submitted sales orders can be rejected',
      );
    }

    const rejectionReason = this.normalizeRequiredText(
      reason,
      'Rejection reason',
    );

    order.status = SalesOrderStatus.REJECTED;
    order.approvedBy = null;
    order.approvedAt = null;
    order.rejectionReason = rejectionReason;
    order.syncStatus = SalesOrderSyncStatus.PENDING;
    order.lastSyncedAt = null;

    await this.salesOrderRepository.save(order);

    const rejectedOrder = await this.findSalesOrderEntity(order.id, companyId);

    this.logger.log(`Sales order ${order.orderNumber} rejected by ${actorId}`);

    return this.toSalesOrderResponse(rejectedOrder);
  }
  async cancelSalesOrder(
    orderId: string,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);
    const actorId = this.requireActorId(context);

    const order = await this.findSalesOrderEntity(orderId, companyId);

    const cancellableStatuses = [
      SalesOrderStatus.DRAFT,
      SalesOrderStatus.SUBMITTED,
      SalesOrderStatus.APPROVED,
      SalesOrderStatus.REJECTED,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('This sales order cannot be cancelled');
    }

    order.status = SalesOrderStatus.CANCELLED;
    order.syncStatus = SalesOrderSyncStatus.PENDING;
    order.lastSyncedAt = null;

    await this.salesOrderRepository.save(order);

    const cancelledOrder = await this.findSalesOrderEntity(order.id, companyId);

    this.logger.log(`Sales order ${order.orderNumber} cancelled by ${actorId}`);

    return this.toSalesOrderResponse(cancelledOrder);
  }
  async fulfilSalesOrder(
    orderId: string,
    context: SalesRequestContext,
  ): Promise<SalesOrderResponseDto> {
    const companyId = this.requireCompanyId(context);
    const actorId = this.requireActorId(context);

    return this.dataSource.transaction(
      async (entityManager: EntityManager): Promise<SalesOrderResponseDto> => {
        const orderRepository = entityManager.getRepository(SalesOrderEntity);

        const itemRepository = entityManager.getRepository(ItemEntity);

        const order = await orderRepository.findOne({
          where: {
            id: orderId,
            companyId,
            deletedAt: IsNull(),
          },
          relations: {
            customer: true,
            items: true,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!order) {
          throw new NotFoundException('Sales order not found');
        }

        if (order.status !== SalesOrderStatus.APPROVED) {
          throw new BadRequestException(
            'Only approved sales orders can be fulfilled',
          );
        }

        if (!order.items || order.items.length === 0) {
          throw new BadRequestException('Sales order has no items');
        }

        for (const orderItem of order.items) {
          const inventoryItem = await itemRepository.findOne({
            where: {
              id: orderItem.itemId,
              companyId,
              deletedAt: IsNull(),
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });

          if (!inventoryItem) {
            throw new BadRequestException(
              `Inventory item ${orderItem.itemName} no longer exists`,
            );
          }

          const requestedQuantity = Number(orderItem.quantity);

          const availableQuantity = Number(inventoryItem.stockQty);

          if (requestedQuantity > availableQuantity) {
            throw new BadRequestException(
              `Insufficient stock for ${orderItem.itemName}. Available: ${availableQuantity}, required: ${requestedQuantity}`,
            );
          }

          inventoryItem.stockQty = availableQuantity - requestedQuantity;

          inventoryItem.syncStatus = InventorySyncStatus.PENDING;

          inventoryItem.lastSyncedAt = null;

          await itemRepository.save(inventoryItem);
        }

        order.status = SalesOrderStatus.FULFILLED;
        order.syncStatus = SalesOrderSyncStatus.PENDING;
        order.lastSyncedAt = null;

        await orderRepository.save(order);

        const fulfilledOrder = await orderRepository.findOne({
          where: {
            id: order.id,
            companyId,
          },
          relations: {
            customer: true,
            items: true,
          },
        });

        if (!fulfilledOrder) {
          throw new NotFoundException('Fulfilled order could not be loaded');
        }

        this.logger.log(
          `Sales order ${order.orderNumber} fulfilled by ${actorId}`,
        );

        return this.toSalesOrderResponse(fulfilledOrder);
      },
    );
  }
  async getSalesOrderSummary(
    context: SalesRequestContext,
  ): Promise<SalesOrderSummaryResponseDto> {
    const companyId = this.requireCompanyId(context);

    const result = await this.salesOrderRepository
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.status = :draftStatus
      )`,
        'draftOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.status = :submittedStatus
      )`,
        'submittedOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.status = :approvedStatus
      )`,
        'approvedOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.status = :rejectedStatus
      )`,
        'rejectedOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.status = :fulfilledStatus
      )`,
        'fulfilledOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.status = :cancelledStatus
      )`,
        'cancelledOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.syncStatus = :pendingSyncStatus
      )`,
        'pendingSyncOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.syncStatus = :syncedSyncStatus
      )`,
        'syncedOrders',
      )
      .addSelect(
        `COUNT(order.id) FILTER (
        WHERE order.syncStatus = :failedSyncStatus
      )`,
        'failedSyncOrders',
      )
      .addSelect(
        `COALESCE(
        SUM(order.grandTotal) FILTER (
          WHERE order.status = :fulfilledStatus
        ),
        0
      )`,
        'totalSalesValue',
      )
      .where('order.companyId = :companyId', {
        companyId,
      })
      .andWhere('order.deletedAt IS NULL')
      .setParameters({
        draftStatus: SalesOrderStatus.DRAFT,
        submittedStatus: SalesOrderStatus.SUBMITTED,
        approvedStatus: SalesOrderStatus.APPROVED,
        rejectedStatus: SalesOrderStatus.REJECTED,
        fulfilledStatus: SalesOrderStatus.FULFILLED,
        cancelledStatus: SalesOrderStatus.CANCELLED,
        pendingSyncStatus: SalesOrderSyncStatus.PENDING,
        syncedSyncStatus: SalesOrderSyncStatus.SYNCED,
        failedSyncStatus: SalesOrderSyncStatus.FAILED,
      })
      .getRawOne<{
        totalOrders: string;
        draftOrders: string;
        submittedOrders: string;
        approvedOrders: string;
        rejectedOrders: string;
        fulfilledOrders: string;
        cancelledOrders: string;
        pendingSyncOrders: string;
        syncedOrders: string;
        failedSyncOrders: string;
        totalSalesValue: string;
      }>();

    return {
      totalOrders: Number(result?.totalOrders ?? 0),
      draftOrders: Number(result?.draftOrders ?? 0),
      submittedOrders: Number(result?.submittedOrders ?? 0),
      approvedOrders: Number(result?.approvedOrders ?? 0),
      rejectedOrders: Number(result?.rejectedOrders ?? 0),
      fulfilledOrders: Number(result?.fulfilledOrders ?? 0),
      cancelledOrders: Number(result?.cancelledOrders ?? 0),
      pendingSyncOrders: Number(result?.pendingSyncOrders ?? 0),
      syncedOrders: Number(result?.syncedOrders ?? 0),
      failedSyncOrders: Number(result?.failedSyncOrders ?? 0),
      totalSalesValue: Number(result?.totalSalesValue ?? 0),
    };
  }

  // ==========================================================================
  // PRIVATE CUSTOMER HELPERS
  // ==========================================================================

  private async findSalesOrderEntity(
    orderId: string,
    companyId: string,
  ): Promise<SalesOrderEntity> {
    const order = await this.salesOrderRepository.findOne({
      where: {
        id: orderId,
        companyId,
        deletedAt: IsNull(),
      },
      relations: {
        customer: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    return order;
  }
  private async validateCurrentStockForOrder(
    orderItems: SalesOrderItemEntity[],
    companyId: string,
  ): Promise<void> {
    const itemIds = orderItems.map((orderItem) => orderItem.itemId);

    const inventoryItems = await this.itemRepository.find({
      where: {
        id: In(itemIds),
        companyId,
        deletedAt: IsNull(),
      },
    });

    const inventoryMap = new Map(inventoryItems.map((item) => [item.id, item]));

    for (const orderItem of orderItems) {
      const inventoryItem = inventoryMap.get(orderItem.itemId);

      if (!inventoryItem) {
        throw new BadRequestException(
          `Inventory item ${orderItem.itemName} no longer exists`,
        );
      }

      if (Number(orderItem.quantity) > Number(inventoryItem.stockQty)) {
        throw new BadRequestException(
          `Insufficient stock for ${orderItem.itemName}. Available: ${inventoryItem.stockQty}, requested: ${orderItem.quantity}`,
        );
      }
    }
  }

  private async ensureCustomerEmailAvailable(
    companyId: string,
    email: string,
    excludedCustomerId?: string,
  ): Promise<void> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', {
        companyId,
      })
      .andWhere(
        `LOWER(customer.email)
           = LOWER(:email)`,
        {
          email,
        },
      )
      .andWhere('customer.deletedAt IS NULL');

    if (excludedCustomerId) {
      queryBuilder.andWhere('customer.id != :excludedCustomerId', {
        excludedCustomerId,
      });
    }

    const duplicate = await queryBuilder.getOne();

    if (duplicate) {
      throw new ConflictException('A customer with this email already exists');
    }
  }

  // ==========================================================================
  // PRIVATE SALES ORDER HELPERS
  // ==========================================================================

  private async calculateOrderLines(
    requestedLines: OrderItemDto[],
    companyId: string,
    itemRepository: Repository<ItemEntity>,
  ): Promise<CalculatedOrderTotals> {
    if (!Array.isArray(requestedLines) || requestedLines.length === 0) {
      throw new BadRequestException(
        'A sales order must contain at least one item',
      );
    }

    const requestedItemIds = requestedLines.map((line) => line.itemId);

    const uniqueItemIds = new Set(requestedItemIds);

    if (uniqueItemIds.size !== requestedItemIds.length) {
      throw new BadRequestException(
        'The same inventory item cannot appear more than once in an order',
      );
    }

    const inventoryItems = await itemRepository.find({
      where: {
        id: In([...uniqueItemIds]),
        companyId,
        deletedAt: IsNull(),
      },
    });

    if (inventoryItems.length !== uniqueItemIds.size) {
      throw new BadRequestException(
        'One or more inventory items were not found',
      );
    }

    const inventoryById = new Map(
      inventoryItems.map((item) => [item.id, item]),
    );

    const calculatedLines: CalculatedOrderLine[] = [];

    for (const requestedLine of requestedLines) {
      const item = inventoryById.get(requestedLine.itemId);

      if (!item) {
        throw new BadRequestException(
          `Inventory item ${requestedLine.itemId} was not found`,
        );
      }

      const quantity = this.ensurePositiveNumber(
        requestedLine.quantity,
        `Quantity for ${item.name}`,
      );

      if (quantity > item.stockQty) {
        throw new BadRequestException(
          `Insufficient stock for ${item.name}. Available: ${item.stockQty}, requested: ${quantity}`,
        );
      }

      const unitPrice =
        requestedLine.unitPrice === undefined
          ? this.ensureNonNegativeNumber(
              item.salePrice,
              `Sale price for ${item.name}`,
            )
          : this.ensureNonNegativeNumber(
              requestedLine.unitPrice,
              `Unit price for ${item.name}`,
            );

      const discountPercent = this.ensurePercentage(
        requestedLine.discountPercent ?? 0,
        `Discount percentage for ${item.name}`,
      );

      const taxPercent = this.ensurePercentage(
        requestedLine.taxPercent ?? 0,
        `Tax percentage for ${item.name}`,
      );

      const rawSubtotal = quantity * unitPrice;

      const rawDiscount = rawSubtotal * (discountPercent / 100);

      const taxableAmount = rawSubtotal - rawDiscount;

      const rawTax = taxableAmount * (taxPercent / 100);

      const rawTotal = taxableAmount + rawTax;

      calculatedLines.push({
        item,
        quantity: this.roundNumber(quantity, 4),
        unitPrice: this.roundNumber(unitPrice, 4),
        discountPercent: this.roundNumber(discountPercent, 2),
        taxPercent: this.roundNumber(taxPercent, 2),
        lineSubtotal: this.roundMoney(rawSubtotal),
        lineDiscount: this.roundMoney(rawDiscount),
        lineTax: this.roundMoney(rawTax),
        lineTotal: this.roundMoney(rawTotal),
      });
    }

    const subtotal = this.roundMoney(
      calculatedLines.reduce((total, line) => total + line.lineSubtotal, 0),
    );

    const discountTotal = this.roundMoney(
      calculatedLines.reduce((total, line) => total + line.lineDiscount, 0),
    );

    const taxTotal = this.roundMoney(
      calculatedLines.reduce((total, line) => total + line.lineTax, 0),
    );

    const grandTotal = this.roundMoney(
      calculatedLines.reduce((total, line) => total + line.lineTotal, 0),
    );

    return {
      lines: calculatedLines,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };
  }

  private async generateUniqueOrderNumber(
    companyId: string,
    orderRepository: Repository<SalesOrderEntity>,
  ): Promise<string> {
    const now = new Date();

    const year = String(now.getFullYear());

    const month = String(now.getMonth() + 1).padStart(2, '0');

    const day = String(now.getDate()).padStart(2, '0');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const randomPart = randomBytes(3).toString('hex').toUpperCase();

      const orderNumber = `SO-${year}${month}${day}-${randomPart}`;

      const existing = await orderRepository.findOne({
        where: {
          companyId,
          orderNumber,
          deletedAt: IsNull(),
        },
      });

      if (!existing) {
        return orderNumber;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique sales order number',
    );
  }

  // ==========================================================================
  // RESPONSE MAPPERS
  // ==========================================================================

  private toCustomerResponse(customer: CustomerEntity): CustomerResponseDto {
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
    };
  }

  private toSalesOrderResponse(order: SalesOrderEntity): SalesOrderResponseDto {
    if (!order.customer) {
      throw new Error('Sales order customer relation was not loaded');
    }

    return {
      id: order.id,
      companyId: order.companyId,
      customerId: order.customerId,
      createdBy: order.createdBy,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      status: order.status,
      subtotal: Number(order.subtotal),
      taxTotal: Number(order.taxTotal),
      discountTotal: Number(order.discountTotal),
      grandTotal: Number(order.grandTotal),
      notes: order.notes,
      approvalRequired: order.approvalRequired,
      approvedBy: order.approvedBy,
      approvedAt: order.approvedAt,
      rejectionReason: order.rejectionReason,
      syncStatus: order.syncStatus,
      lastSyncedAt: order.lastSyncedAt,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        tallyLedgerName: order.customer.tallyLedgerName,
      },
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        itemId: item.itemId,
        itemName: item.itemName,
        sku: item.sku,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxPercent: Number(item.taxPercent),
        lineSubtotal: Number(item.lineSubtotal),
        lineDiscount: Number(item.lineDiscount),
        lineTax: Number(item.lineTax),
        lineTotal: Number(item.lineTotal),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  // ==========================================================================
  // GENERAL VALIDATION HELPERS
  // ==========================================================================

  private requireCompanyId(context: SalesRequestContext): string {
    if (!context.companyId) {
      throw new BadRequestException(
        'The authenticated user is not assigned to a company',
      );
    }

    return context.companyId;
  }

  private requireActorId(context: SalesRequestContext): string {
    if (!context.actorId) {
      throw new BadRequestException(
        'Authenticated user information is missing',
      );
    }

    return context.actorId;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private normalizeEmail(value: string | null | undefined): string | null {
    const normalized = this.normalizeNullableText(value);

    return normalized ? normalized.toLowerCase() : null;
  }

  private ensureNonNegativeNumber(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number`,
      );
    }

    return value;
  }

  private ensurePositiveNumber(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be greater than zero`);
    }

    return value;
  }

  private ensurePercentage(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new BadRequestException(`${fieldName} must be between 0 and 100`);
    }

    return value;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundNumber(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;

    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private validateOrderDates(
    orderDate: string,
    expectedDeliveryDate: string | null | undefined,
  ): void {
    const parsedOrderDate = new Date(`${orderDate}T00:00:00Z`);

    if (Number.isNaN(parsedOrderDate.getTime())) {
      throw new BadRequestException('Order date is invalid');
    }

    if (!expectedDeliveryDate) {
      return;
    }

    const parsedDeliveryDate = new Date(`${expectedDeliveryDate}T00:00:00Z`);

    if (Number.isNaN(parsedDeliveryDate.getTime())) {
      throw new BadRequestException('Expected delivery date is invalid');
    }

    if (parsedDeliveryDate < parsedOrderDate) {
      throw new BadRequestException(
        'Expected delivery date cannot be before the order date',
      );
    }
  }
  private async findCustomerEntity(
    customerId: string,
    companyId: string,
  ): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: customerId,
        companyId,
        deletedAt: IsNull(),
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }
}
