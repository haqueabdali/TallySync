import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TallyMasterService } from './tally-master.service';
import {
  TallySalesVoucherPreview,
  TallyXmlService,
} from './tally-xml.service';
import { TallyHttpService } from './tally-http.service';
import {
  TallyParserService,
  TallyVoucherImportResult,
} from './tally-parser.service';
import {
  TallyHealthResult,
  TallyHealthService,
} from './tally-health.service';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { PreviewSalesVoucherDto } from './dto/preview-sales-voucher.dto';





type TallyStockItemDefinition = {
  name: string;
  parent: string;
  baseUnit: string;
};

@Injectable()
export class TallySyncService {
  constructor(
    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,
    private readonly tallyMasterService: TallyMasterService,
    private readonly tallyXmlService: TallyXmlService,
    private readonly tallyHttpService: TallyHttpService,
    private readonly tallyParserService: TallyParserService,
    private readonly tallyHealthService: TallyHealthService,
    private readonly configService: ConfigService,
  ) {}

  checkTallyConnection(): Promise<TallyHealthResult> {
    return this.tallyHealthService.checkConnection();
  }

  async findPendingSalesOrders(): Promise<{
    count: number;
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      syncStatus: string;
    }>;
  }> {
    const orders = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .where('salesOrder.status = :status', {
        status: 'fulfilled',
      })
      .andWhere(
  'salesOrder.syncStatus IN (:...syncStatuses)',
  {
    syncStatuses: ['pending', 'failed'],
  },
)
      .andWhere('salesOrder.deletedAt IS NULL')
      .orderBy('salesOrder.createdAt', 'ASC')
      .getMany();

    return {
      count: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: String(order.status),
        syncStatus: String(order.syncStatus),
      })),
    };
  }

  previewSalesVoucher(
    dto: PreviewSalesVoucherDto,
  ): TallySalesVoucherPreview {
    return this.tallyXmlService.buildSalesVoucher(dto);
  }

  async syncSalesOrder(id: string): Promise<{
    success: boolean;
    alreadySynced: boolean;
    orderId: string;
    orderNumber: string;
    syncStatus: string;
    tallyVoucherId: string | null;
    tallyVoucherNumber: string | null;
    tally?: TallyVoucherImportResult;
    responsePreview?: string;
  }> {
    const claimedOrder = await this.claimSalesOrderForSync(id);

    if (String(claimedOrder.syncStatus) === 'synced') {
      return {
        success: true,
        alreadySynced: true,
        orderId: claimedOrder.id,
        orderNumber: claimedOrder.orderNumber,
        syncStatus: String(claimedOrder.syncStatus),
        tallyVoucherId: claimedOrder.tallyVoucherId ?? null,
        tallyVoucherNumber:
          claimedOrder.tallyVoucherNumber ?? claimedOrder.orderNumber,
      };
    }

    let order: SalesOrderEntity | null = null;
    let responseText = '';

    try {
      order = await this.loadSalesOrderForTally(id);

      if (String(order.status) !== 'fulfilled') {
        throw new BadRequestException(
          `Only fulfilled sales orders can be synchronized. Current status: ${String(
            order.status,
          )}`,
        );
      }

      if (!order.customer) {
        throw new BadRequestException(
          'Sales order does not have a customer',
        );
      }

      if (!order.items?.length) {
        throw new BadRequestException(
          'Sales order does not contain any items',
        );
      }

      const salesLedgerName = this.configService
        .get<string>('TALLY_SALES_LEDGER_NAME', 'Sales')
        .trim();

      const defaultUnit = this.configService
        .get<string>('TALLY_DEFAULT_UNIT', 'Nos')
        .trim();

      const defaultGodown = this.configService
        .get<string>('TALLY_DEFAULT_GODOWN', 'Main Location')
        .trim();

      const defaultStockGroup = this.configService
        .get<string>('TALLY_DEFAULT_STOCK_GROUP', 'Primary')
        .trim();

      const stockItems: TallyStockItemDefinition[] = order.items.map(
  (orderItem) => {
    if (!orderItem.item) {
      throw new BadRequestException(
        'One or more sales-order items do not have an inventory item',
      );
    }

    const stockItemName =
      orderItem.item.tallyItemName?.trim() ||
      orderItem.item.name?.trim();

    if (!stockItemName) {
      throw new BadRequestException(
        'One or more inventory items do not have a valid Tally item name',
      );
    }

    return {
      name: stockItemName,
      parent: defaultStockGroup,
      baseUnit: defaultUnit,
    };
  },
);

      const voucherDate = this.toIsoDate(order.orderDate);

      await this.tallyMasterService.ensureLedgerMasters([
  {
    name: order.customer.name,
    parent: 'Sundry Debtors',
    isBillWise: true,
  },
  {
    name: salesLedgerName,
    parent: 'Sales Accounts',
    isBillWise: false,
  },
]);



      await this.tallyMasterService.ensureStockItemMasters(stockItems);

      const voucher = this.previewSalesVoucher({
        voucherNumber: order.orderNumber,
        voucherDate,
        customerLedgerName: order.customer.name,
        salesLedgerName,
        items: order.items.map((orderItem) => {
          if (!orderItem.item) {
            throw new BadRequestException(
              'One or more sales-order items do not have an inventory item',
            );
          }

          return {
            stockItemName:
              orderItem.item.tallyItemName?.trim() ||
              orderItem.item.name,
            quantity: Number(orderItem.quantity),
            rate: Number(orderItem.unitPrice),
            unit: defaultUnit,
            godownName: defaultGodown,
          };
        }),
      });

      responseText = await this.tallyHttpService.postXml(
        voucher.xml,
        20_000,
      );

      const tallyResult =
        this.tallyParserService.parseVoucherImportResponse(responseText);

      if (!tallyResult.success) {
        const tallyError =
          tallyResult.lineError ??
          this.tallyParserService.buildVoucherFailureMessage(tallyResult);

        throw new BadGatewayException({
          message: tallyError,
          orderId: order.id,
          orderNumber: order.orderNumber,
          tally: tallyResult,
          responsePreview: responseText.substring(0, 2_000),
        });
      }

      await this.salesOrderRepository.update(
        { id: order.id },
        {
          syncStatus:
            'synced' as SalesOrderEntity['syncStatus'],
          lastSyncedAt: new Date(),
          tallyVoucherId:
            tallyResult.lastVoucherId > 0
              ? String(tallyResult.lastVoucherId)
              : null,
          tallyVoucherNumber:
            tallyResult.voucherNumber ?? order.orderNumber,
          tallySyncError: null,
        },
      );

      return {
        success: true,
        alreadySynced: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        syncStatus: 'synced',
        tallyVoucherId:
          tallyResult.lastVoucherId > 0
            ? String(tallyResult.lastVoucherId)
            : null,
        tallyVoucherNumber:
          tallyResult.voucherNumber ?? order.orderNumber,
        tally: tallyResult,
        responsePreview: responseText.substring(0, 2_000),
      };
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);

      try {
        await this.markOrderSyncFailed(
          order?.id ?? claimedOrder.id,
          message,
        );
      } catch {
        // Preserve the original synchronization error.
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException(
        `Failed to synchronize sales order ${
          order?.orderNumber ?? claimedOrder.orderNumber
        }: ${message}`,
      );
    }
  }

  async syncPendingSalesOrders(): Promise<{
    total: number;
    synced: number;
    alreadySynced: number;
    failed: number;
    results: Array<{
      orderId: string;
      orderNumber: string;
      status: 'synced' | 'already-synced' | 'failed';
      error?: string;
    }>;
  }> {
    const pending = await this.findPendingSalesOrders();
    const results: Array<{
      orderId: string;
      orderNumber: string;
      status: 'synced' | 'already-synced' | 'failed';
      error?: string;
    }> = [];

    let synced = 0;
    let alreadySynced = 0;
    let failed = 0;

    for (const order of pending.orders) {
      try {
        const result = await this.syncSalesOrder(order.id);

        if (result.alreadySynced) {
          alreadySynced += 1;
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: 'already-synced',
          });
        } else {
          synced += 1;
          results.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: 'synced',
          });
        }
      } catch (error: unknown) {
        failed += 1;
        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: 'failed',
          error: this.getErrorMessage(error),
        });
      }
    }

    return {
      total: pending.count,
      synced,
      alreadySynced,
      failed,
      results,
    };
  }

  private async claimSalesOrderForSync(
    id: string,
  ): Promise<SalesOrderEntity> {
    return this.salesOrderRepository.manager.transaction(
      async (manager) => {
        const repository =
          manager.getRepository(SalesOrderEntity);

        const order = await repository
          .createQueryBuilder('salesOrder')
          .setLock('pessimistic_write')
          .where('salesOrder.id = :id', { id })
          .andWhere('salesOrder.deletedAt IS NULL')
          .getOne();

        if (!order) {
          throw new NotFoundException(
            'Sales order not found',
          );
        }

        const syncStatus = String(order.syncStatus);

        if (syncStatus === 'synced') {
          return order;
        }

        if (syncStatus === 'syncing') {
          const staleAfterMilliseconds = 60 * 1_000;

          const databaseClockRows: Array<{
            now: Date | string;
          }> = await manager.query(
            'SELECT NOW() AS "now"',
          );

          const databaseNowValue =
            databaseClockRows[0]?.now;

          const databaseNowTime = new Date(
            String(databaseNowValue),
          ).getTime();

          const updatedAtTime =
            order.updatedAt instanceof Date
              ? order.updatedAt.getTime()
              : new Date(
                  String(order.updatedAt),
                ).getTime();

          const lockAgeMilliseconds =
            databaseNowTime - updatedAtTime;

          const isStale =
            !Number.isFinite(updatedAtTime) ||
            (Number.isFinite(databaseNowTime) &&
              lockAgeMilliseconds >=
                staleAfterMilliseconds);

          if (!isStale) {
            const retryAfterSeconds = Math.max(
              1,
              Math.ceil(
                (staleAfterMilliseconds -
                  lockAgeMilliseconds) /
                  1_000,
              ),
            );

            throw new ConflictException({
              message:
                'Sales order synchronization is already in progress',
              orderId: order.id,
              orderNumber: order.orderNumber,
              syncStatus,
              retryAfterSeconds,
            });
          }
        }

        order.syncStatus =
          'syncing' as SalesOrderEntity['syncStatus'];

        order.tallySyncAttempts =
          Number(order.tallySyncAttempts ?? 0) + 1;

        order.tallySyncError = null;

        return repository.save(order);
      },
    );
  }

  private async loadSalesOrderForTally(
    id: string,
  ): Promise<SalesOrderEntity> {
    const order = await this.salesOrderRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: {
          item: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Sales order not found',
      );
    }

    return order;
  }

  private async markOrderSyncFailed(
    orderId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.salesOrderRepository.update(
      { id: orderId },
      {
        syncStatus:
          'failed' as SalesOrderEntity['syncStatus'],
        tallySyncError: errorMessage.substring(0, 10_000),
        lastSyncedAt: new Date(),
      },
    );
  }


  private getTallyCompanyName(): string {
    const companyName =
      this.configService.getOrThrow<string>(
        'TALLY_COMPANY_NAME',
      );

    if (!companyName.trim()) {
      throw new BadRequestException(
        'TALLY_COMPANY_NAME must not be empty',
      );
    }

    return companyName.trim();
  }

  private toIsoDate(value: Date | string): string {
    const date =
      value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Sales order has an invalid order date',
      );
    }

    return date.toISOString().slice(0, 10);
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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