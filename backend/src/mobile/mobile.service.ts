import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, ILike, In, IsNull, Repository } from 'typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';
import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import {
  SalesOrderEntity,
  SalesOrderStatus,
  SalesOrderSyncStatus,
} from '../sales-orders/entities/sales-order.entity';
import { TallyHealthService } from '../tally-sync/tally-health.service';
import { TallySyncService } from '../tally-sync/tally-sync.service';
import { CreateMobileSalesOrderDto } from './dto/create-mobile-sales-order.dto';
import { MobileSalesOrderQueryDto } from './dto/mobile-sales-order-query.dto';

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sellingPrice: string | number | null;
  stock: string | number | null;
  unit: string | null;
};

@Injectable()
export class MobileService {
  constructor(
    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,

    @InjectRepository(SalesOrderItemEntity)
    private readonly salesOrderItemRepository: Repository<SalesOrderItemEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,

    private readonly tallySyncService: TallySyncService,
    private readonly tallyHealthService: TallyHealthService,
  ) {}

  async getDashboard() {
    const [totalOrders, pendingSync, failedSync, tally] = await Promise.all([
      this.countOrders(),
      this.countOrders(SalesOrderSyncStatus.PENDING),
      this.countOrders(SalesOrderSyncStatus.FAILED),
      this.getSafeTallyStatus(),
    ]);

    const totalResult = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .select('COALESCE(SUM(salesOrder.grandTotal), 0)', 'total')
      .where('salesOrder.deletedAt IS NULL')
      .getRawOne<{ total: string | number | null }>();

    return {
      success: true,
      message: 'Dashboard loaded successfully',
      data: {
        totalOrders,
        pendingSync,
        failedSync,
        totalSales: Number(totalResult?.total ?? 0),
        tally,
      },
    };
  }

  async getCustomers(search?: string) {
    const normalizedSearch = search?.trim();

    const customers = await this.customerRepository.find({
      where: normalizedSearch
        ? [
            { name: ILike(`%${normalizedSearch}%`), deletedAt: IsNull() },
            { email: ILike(`%${normalizedSearch}%`), deletedAt: IsNull() },
            { phone: ILike(`%${normalizedSearch}%`), deletedAt: IsNull() },
          ]
        : { deletedAt: IsNull() },
      order: { name: 'ASC' },
      take: 100,
    });

    return {
      success: true,
      message: 'Customers loaded successfully',
      data: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      })),
    };
  }

  async getProducts(search?: string) {
    const normalizedSearch = search?.trim();

    const query = this.itemRepository
      .createQueryBuilder('item')
      .select('item.id', 'id')
      .addSelect('item.name', 'name')
      .addSelect('item.sku', 'sku')
      .addSelect('NULL', 'barcode')
      .addSelect('item.salePrice', 'sellingPrice')
      .addSelect('item.stockQty', 'stock')
      .addSelect('item.unit', 'unit')
      .where('item.deletedAt IS NULL')
      .orderBy('item.name', 'ASC')
      .take(100);

    if (normalizedSearch) {
      query.andWhere(
        new Brackets((where) => {
          where
            .where('item.name ILIKE :search', {
              search: `%${normalizedSearch}%`,
            })
            .orWhere('item.sku ILIKE :search', {
              search: `%${normalizedSearch}%`,
            });
        }),
      );
    }

    const products = await query.getRawMany<ProductRow>();

    return {
      success: true,
      message: 'Products loaded successfully',
      data: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        sellingPrice: Number(product.sellingPrice ?? 0),
        stock: Number(product.stock ?? 0),
        unit: product.unit,
      })),
    };
  }

  async getSalesOrders(query: MobileSalesOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const builder = this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .leftJoinAndSelect('salesOrder.customer', 'customer')
      .where('salesOrder.deletedAt IS NULL');

    if (query.syncStatus) {
      builder.andWhere('salesOrder.syncStatus = :syncStatus', {
        syncStatus: query.syncStatus,
      });
    }

    const search = query.search?.trim();

    if (search) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('salesOrder.orderNumber ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('customer.name ILIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }

    const [orders, total] = await builder
      .orderBy('salesOrder.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      message: 'Sales orders loaded successfully',
      data: {
        orders: orders.map((order) => this.toOrderSummary(order)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    };
  }

  async getSalesOrder(id: string) {
    const order = await this.salesOrderRepository.findOne({
      where: { id },
      relations: { customer: true, items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('Sales order not found');
    }

    return {
      success: true,
      message: 'Sales order loaded successfully',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
        status: order.status,
        syncStatus: order.syncStatus,
        subtotal: order.subtotal,
        taxTotal: order.taxTotal,
        discountTotal: order.discountTotal,
        grandTotal: order.grandTotal,
        notes: order.notes,
        tallyVoucherId: order.tallyVoucherId,
        tallyVoucherNumber: order.tallyVoucherNumber,
        tallySyncError: order.tallySyncError,
        tallySyncAttempts: order.tallySyncAttempts,
        lastSyncedAt: order.lastSyncedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
          address: order.customer.address,
        },
        items: order.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemName: item.itemName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          lineSubtotal: item.lineSubtotal,
          lineDiscount: item.lineDiscount,
          lineTax: item.lineTax,
          lineTotal: item.lineTotal,
        })),
      },
    };
  }

  async createSalesOrder(dto: CreateMobileSalesOrderDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId, deletedAt: IsNull() },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const uniqueProductIds = [
      ...new Set(dto.items.map((item) => item.productId)),
    ];
    const products = await this.itemRepository.find({
      where: { id: In(uniqueProductIds) },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    const preparedItems = dto.items.map((requestedItem) => {
      const product = productById.get(requestedItem.productId);

      if (!product) {
        throw new NotFoundException(
          `Product ${requestedItem.productId} was not found`,
        );
      }

      const quantity = Number(requestedItem.quantity);
      const unitPrice = Number(requestedItem.unitPrice);
      const lineSubtotal = this.roundMoney(quantity * unitPrice);

      if (!Number.isFinite(lineSubtotal) || lineSubtotal <= 0) {
        throw new BadRequestException(
          `Invalid total for product ${requestedItem.productId}`,
        );
      }

      const productData = product as ItemEntity & {
        sku?: string | null;
        unit?: string | null;
      };

      return { product, productData, quantity, unitPrice, lineSubtotal };
    });

    const subtotal = this.roundMoney(
      preparedItems.reduce((sum, item) => sum + item.lineSubtotal, 0),
    );

    const order = this.salesOrderRepository.create({
      companyId: customer.companyId,
      customerId: customer.id,
      customer,
      createdBy: customer.id,
      orderNumber: this.createOrderNumber(),
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: null,
      status: SalesOrderStatus.SUBMITTED,
      subtotal,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: subtotal,
      notes: dto.notes?.trim() || null,
      approvalRequired: false,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      syncStatus: SalesOrderSyncStatus.PENDING,
      tallyVoucherId: null,
      tallyVoucherNumber: null,
      tallySyncError: null,
      tallySyncAttempts: 0,
      lastSyncedAt: null,
    });

    const savedOrder = await this.salesOrderRepository.save(order);

    const orderItems = preparedItems.map(
      ({ product, productData, quantity, unitPrice, lineSubtotal }) =>
        this.salesOrderItemRepository.create({
          salesOrderId: savedOrder.id,
          salesOrder: savedOrder,
          itemId: product.id,
          item: product,
          itemName: product.name,
          sku: productData.sku ?? null,
          quantity,
          unit: productData.unit?.trim() || 'PCS',
          unitPrice,
          discountPercent: 0,
          taxPercent: 0,
          lineSubtotal,
          lineDiscount: 0,
          lineTax: 0,
          lineTotal: lineSubtotal,
        }),
    );

    await this.salesOrderItemRepository.save(orderItems);

    return {
      success: true,
      message: 'Sales order created successfully',
      data: {
        id: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        totalAmount: savedOrder.grandTotal,
        syncStatus: savedOrder.syncStatus,
      },
    };
  }

  async syncSalesOrder(id: string) {
    const result = await this.tallySyncService.syncSalesOrder(id);

    return {
      success: true,
      message: result.alreadySynced
        ? 'Sales order was already synchronized'
        : 'Sales order synchronized successfully',
      data: result,
    };
  }

  async retrySalesOrder(id: string) {
    return this.syncSalesOrder(id);
  }

  async syncPendingSalesOrders() {
    const result = await this.tallySyncService.syncPendingSalesOrders();

    return {
      success: result.failed === 0,
      message:
        result.failed === 0
          ? 'Pending sales orders synchronized successfully'
          : 'Synchronization completed with some failures',
      data: result,
    };
  }

  async getTallyStatus() {
    const status = await this.getSafeTallyStatus();

    return {
      success: status.connected,
      message: status.connected
        ? 'Tally is connected'
        : 'Tally is disconnected',
      data: status,
    };
  }

  private countOrders(syncStatus?: SalesOrderSyncStatus): Promise<number> {
    return this.salesOrderRepository.count({
      where: syncStatus
        ? { syncStatus, deletedAt: IsNull() }
        : { deletedAt: IsNull() },
    });
  }

  private async getSafeTallyStatus(): Promise<{
    connected: boolean;
    responseTimeMilliseconds: number | null;
    checkedAt: string;
    companyName: string | null;
    error: string | null;
  }> {
    try {
      const status = await this.tallyHealthService.checkConnection();

      return {
        connected: true,
        responseTimeMilliseconds: status.responseTimeMilliseconds,
        checkedAt: status.checkedAt,
        companyName: status.tallyCompanyName,
        error: null,
      };
    } catch (error: unknown) {
      return {
        connected: false,
        responseTimeMilliseconds: null,
        checkedAt: new Date().toISOString(),
        companyName: null,
        error: this.getErrorMessage(error),
      };
    }
  }

  private toOrderSummary(order: SalesOrderEntity) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customerName: order.customer?.name ?? 'Unknown customer',
      grandTotal: order.grandTotal,
      status: order.status,
      syncStatus: order.syncStatus,
      tallySyncAttempts: order.tallySyncAttempts,
      tallySyncError: order.tallySyncError,
      lastSyncedAt: order.lastSyncedAt,
      createdAt: order.createdAt,
    };
  }

  private createOrderNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replaceAll('-', '');
    const time = now.toISOString().slice(11, 19).replaceAll(':', '');
    return `SO-${date}-${time}`;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
  }
}
