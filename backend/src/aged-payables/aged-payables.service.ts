import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { PurchaseReturnStatus } from '../purchase-returns/enums/purchase-return-status.enum';
import { SupplierPaymentStatus } from '../supplier-payments/enums/supplier-payment-status.enum';
import { AgedPayablesFilterDto } from './dto/aged-payables-filter.dto';
import {
  AgedPayableInvoiceDto,
  AgedPayableSupplierDto,
  AgedPayablesResponseDto,
  PayableAgingBucketsDto,
} from './dto/aged-payables-response.dto';

type AgingBucketKey = keyof Omit<PayableAgingBucketsDto, 'total'>;

interface PayableRawRow {
  invoiceId: string;
  invoiceNumber: string;
  supplierInvoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currency: string;
  grandTotal: string | number;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  supplierEmail: string | null;
  supplierPhone: string | null;
  paymentsApplied: string | number | null;
  purchaseReturnsApplied: string | number | null;
}

@Injectable()
export class AgedPayablesService {
  constructor(
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
  ) {}

  async getReport(
    filter: AgedPayablesFilterDto,
    companyId: string,
  ): Promise<AgedPayablesResponseDto> {
    const rows = await this.getPayables(filter, companyId);
    const supplierMap = new Map<string, AgedPayableSupplierDto>();
    const totals = this.createEmptyBuckets();

    for (const row of rows) {
      const originalAmount = this.round(Number(row.grandTotal));
      const paymentsApplied = this.round(Number(row.paymentsApplied ?? 0));
      const purchaseReturnsApplied = this.round(
        Number(row.purchaseReturnsApplied ?? 0),
      );
      const outstandingAmount = this.round(
        Math.max(
          0,
          originalAmount - paymentsApplied - purchaseReturnsApplied,
        ),
      );

      if (outstandingAmount <= 0) {
        continue;
      }

      const agingDate = row.dueDate ?? row.invoiceDate;
      const daysPastDue = this.daysBetween(agingDate, filter.asOfDate);
      const bucket = this.resolveBucket(daysPastDue);

      if (!filter.includeNotYetDue && bucket === 'notYetDue') {
        continue;
      }

      const invoice: AgedPayableInvoiceDto = {
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        supplierInvoiceNumber: row.supplierInvoiceNumber,
        invoiceDate: row.invoiceDate,
        dueDate: row.dueDate,
        daysPastDue,
        originalAmount,
        paymentsApplied,
        purchaseReturnsApplied,
        outstandingAmount,
        bucket,
      };

      const mapKey = `${row.supplierId}:${row.currency}`;
      const supplier = supplierMap.get(mapKey) ?? {
        supplierId: row.supplierId,
        supplierCode: row.supplierCode,
        supplierName: row.supplierName,
        email: row.supplierEmail,
        phone: row.supplierPhone,
        currency: row.currency,
        buckets: this.createEmptyBuckets(),
        invoices: [],
      };

      supplier.invoices.push(invoice);
      this.addToBuckets(supplier.buckets, bucket, outstandingAmount);
      this.addToBuckets(totals, bucket, outstandingAmount);
      supplierMap.set(mapKey, supplier);
    }

    const allSuppliers = [...supplierMap.values()].sort((left, right) =>
      left.supplierName.localeCompare(right.supplierName),
    );
    const page = filter.page;
    const limit = filter.limit;
    const totalSuppliers = allSuppliers.length;
    const offset = (page - 1) * limit;

    return {
      asOfDate: filter.asOfDate,
      currency: filter.currency?.toUpperCase() ?? null,
      totals,
      suppliers: allSuppliers.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        totalSuppliers,
        totalPages: Math.ceil(totalSuppliers / limit),
      },
    };
  }

  private async getPayables(
    filter: AgedPayablesFilterDto,
    companyId: string,
  ): Promise<PayableRawRow[]> {
    const query = this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .innerJoin('invoice.supplier', 'supplier')
      .select('invoice.id', 'invoiceId')
      .addSelect('invoice.invoiceNumber', 'invoiceNumber')
      .addSelect('invoice.supplierInvoiceNumber', 'supplierInvoiceNumber')
      .addSelect('invoice.invoiceDate', 'invoiceDate')
      .addSelect('invoice.dueDate', 'dueDate')
      .addSelect('invoice.currency', 'currency')
      .addSelect('invoice.grandTotal', 'grandTotal')
      .addSelect('supplier.id', 'supplierId')
      .addSelect('supplier.supplierCode', 'supplierCode')
      .addSelect('supplier.name', 'supplierName')
      .addSelect('supplier.email', 'supplierEmail')
      .addSelect('supplier.phone', 'supplierPhone')
      .addSelect(
        `(SELECT COALESCE(SUM(allocation.allocated_amount), 0)
          FROM supplier_payment_allocations allocation
          INNER JOIN supplier_payments payment
            ON payment.id = allocation.supplier_payment_id
          WHERE allocation.purchase_invoice_id = invoice.id
            AND payment.company_id = :companyId
            AND payment.status = :paymentStatus
            AND payment.payment_date <= :asOfDate
            AND payment.deleted_at IS NULL)`,
        'paymentsApplied',
      )
      .addSelect(
        `(SELECT COALESCE(SUM(purchase_return.grand_total), 0)
          FROM purchase_returns purchase_return
          WHERE purchase_return.purchase_invoice_id = invoice.id
            AND purchase_return.company_id = :companyId
            AND purchase_return.status = :returnStatus
            AND purchase_return.return_date <= :asOfDate
            AND purchase_return.deleted_at IS NULL)`,
        'purchaseReturnsApplied',
      )
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceDate <= :asOfDate', {
        asOfDate: filter.asOfDate,
      })
      .andWhere('invoice.status IN (:...invoiceStatuses)', {
        invoiceStatuses: [
          PurchaseInvoiceStatus.POSTED,
          PurchaseInvoiceStatus.PARTIALLY_PAID,
          PurchaseInvoiceStatus.PAID,
        ],
      })
      .andWhere('invoice.deletedAt IS NULL')
      .andWhere('supplier.deletedAt IS NULL')
      .setParameter('paymentStatus', SupplierPaymentStatus.POSTED)
      .setParameter('returnStatus', PurchaseReturnStatus.Posted)
      .orderBy('supplier.name', 'ASC')
      .addOrderBy('invoice.dueDate', 'ASC', 'NULLS FIRST')
      .addOrderBy('invoice.invoiceDate', 'ASC');

    if (filter.supplierId) {
      query.andWhere('invoice.supplierId = :supplierId', {
        supplierId: filter.supplierId,
      });
    }

    if (filter.currency) {
      query.andWhere('invoice.currency = :currency', {
        currency: filter.currency.toUpperCase(),
      });
    }

    return query.getRawMany<PayableRawRow>();
  }

  private resolveBucket(daysPastDue: number): AgingBucketKey {
    if (daysPastDue <= 0) {
      return 'notYetDue';
    }
    if (daysPastDue <= 30) {
      return 'days1To30';
    }
    if (daysPastDue <= 60) {
      return 'days31To60';
    }
    if (daysPastDue <= 90) {
      return 'days61To90';
    }
    if (daysPastDue <= 120) {
      return 'days91To120';
    }
    return 'over120Days';
  }

  private daysBetween(fromDate: string, toDate: string): number {
    const from = Date.parse(`${fromDate}T00:00:00.000Z`);
    const to = Date.parse(`${toDate}T00:00:00.000Z`);
    return Math.floor((to - from) / 86_400_000);
  }

  private createEmptyBuckets(): PayableAgingBucketsDto {
    return {
      notYetDue: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days91To120: 0,
      over120Days: 0,
      total: 0,
    };
  }

  private addToBuckets(
    buckets: PayableAgingBucketsDto,
    bucket: AgingBucketKey,
    amount: number,
  ): void {
    buckets[bucket] = this.round(buckets[bucket] + amount);
    buckets.total = this.round(buckets.total + amount);
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
