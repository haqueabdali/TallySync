import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import {
  SalesOrderEntity,
  SalesOrderSyncStatus,
} from '../sales-orders/entities/sales-order.entity';
import { TallyHealthService } from '../tally-sync/tally-health.service';
import { TallySyncService } from '../tally-sync/tally-sync.service';
import { MobileSalesOrderQueryDto } from './dto/mobile-sales-order-query.dto';

@Injectable()
export class MobileService {
  constructor(
    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,
    private readonly tallySyncService: TallySyncService,
    private readonly tallyHealthService: TallyHealthService,
  ) {}

  async getDashboard() {
    const [
      totalOrders,
      pendingOrders,
      syncingOrders,
      syncedOrders,
      failedOrders,
      lastSyncedOrder,
      tally,
    ] = await Promise.all([
      this.countOrders(),
      this.countOrders(SalesOrderSyncStatus.PENDING),
      this.countOrders(SalesOrderSyncStatus.SYNCING),
      this.countOrders(SalesOrderSyncStatus.SYNCED),
      this.countOrders(SalesOrderSyncStatus.FAILED),
      this.salesOrderRepository.findOne({
        where: {
          syncStatus: SalesOrderSyncStatus.SYNCED,
        },
        order: {
          lastSyncedAt: 'DESC',
        },
        select: {
          id: true,
          orderNumber: true,
          lastSyncedAt: true,
        },
      }),
      this.getSafeTallyStatus(),
    ]);

    return {
      success: true,
      message: 'Dashboard loaded successfully',
      data: {
        tally,
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          syncing: syncingOrders,
          synced: syncedOrders,
          failed: failedOrders,
        },
        lastSync: lastSyncedOrder
          ? {
              orderId: lastSyncedOrder.id,
              orderNumber: lastSyncedOrder.orderNumber,
              syncedAt: lastSyncedOrder.lastSyncedAt,
            }
          : null,
      },
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
      where: {
        id,
      },
      relations: {
        customer: true,
        items: true,
      },
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
        ? {
            syncStatus,
          }
        : {},
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }
}
