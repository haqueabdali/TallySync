import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomerPaymentStatus } from '../customer-payments/enums/customer-payment-status.enum';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceStatus } from '../sales-invoices/enums/sales-invoice-status.enum';
import { SalesReturnStatus } from '../sales-returns/enums/sales-return-status.enum';
import { AgedReceivablesFilterDto } from './dto/aged-receivables-filter.dto';
import {
  AgedReceivableCustomerDto,
  AgedReceivableInvoiceDto,
  AgedReceivablesResponseDto,
  ReceivableAgingBucketsDto,
} from './dto/aged-receivables-response.dto';

type AgingBucketKey = keyof Omit<ReceivableAgingBucketsDto, 'total'>;

interface ReceivableRawRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  currency: string;
  grandTotal: string | number;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentsApplied: string | number | null;
  salesReturnsApplied: string | number | null;
}

@Injectable()
export class AgedReceivablesService {
  constructor(
    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,
  ) {}

  async getReport(
    filter: AgedReceivablesFilterDto,
    companyId: string,
  ): Promise<AgedReceivablesResponseDto> {
    const rows = await this.getReceivables(filter, companyId);
    const customerMap = new Map<string, AgedReceivableCustomerDto>();
    const totals = this.createEmptyBuckets();

    for (const row of rows) {
      const originalAmount = this.round(Number(row.grandTotal));
      const paymentsApplied = this.round(Number(row.paymentsApplied ?? 0));
      const salesReturnsApplied = this.round(
        Number(row.salesReturnsApplied ?? 0),
      );
      const outstandingAmount = this.round(
        Math.max(0, originalAmount - paymentsApplied - salesReturnsApplied),
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

      const invoice: AgedReceivableInvoiceDto = {
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        invoiceDate: row.invoiceDate,
        dueDate: row.dueDate,
        daysPastDue,
        originalAmount,
        paymentsApplied,
        salesReturnsApplied,
        outstandingAmount,
        bucket,
      };

      const mapKey = `${row.customerId}:${row.currency}`;
      const customer = customerMap.get(mapKey) ?? {
        customerId: row.customerId,
        customerName: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone,
        currency: row.currency,
        buckets: this.createEmptyBuckets(),
        invoices: [],
      };

      customer.invoices.push(invoice);
      this.addToBuckets(customer.buckets, bucket, outstandingAmount);
      this.addToBuckets(totals, bucket, outstandingAmount);
      customerMap.set(mapKey, customer);
    }

    const allCustomers = [...customerMap.values()].sort((left, right) =>
      left.customerName.localeCompare(right.customerName),
    );
    const page = filter.page;
    const limit = filter.limit;
    const totalCustomers = allCustomers.length;
    const offset = (page - 1) * limit;

    return {
      asOfDate: filter.asOfDate,
      currency: filter.currency?.toUpperCase() ?? null,
      totals,
      customers: allCustomers.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
      },
    };
  }

  private async getReceivables(
    filter: AgedReceivablesFilterDto,
    companyId: string,
  ): Promise<ReceivableRawRow[]> {
    const query = this.salesInvoiceRepository
      .createQueryBuilder('invoice')
      .innerJoin('invoice.customer', 'customer')
      .select('invoice.id', 'invoiceId')
      .addSelect('invoice.invoiceNumber', 'invoiceNumber')
      .addSelect('invoice.invoiceDate', 'invoiceDate')
      .addSelect('invoice.dueDate', 'dueDate')
      .addSelect('invoice.currency', 'currency')
      .addSelect('invoice.grandTotal', 'grandTotal')
      .addSelect('customer.id', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('customer.email', 'customerEmail')
      .addSelect('customer.phone', 'customerPhone')
      .addSelect(
        `(SELECT COALESCE(SUM(allocation.allocated_amount), 0)
          FROM customer_payment_allocations allocation
          INNER JOIN customer_payments payment
            ON payment.id = allocation.customer_payment_id
          WHERE allocation.sales_invoice_id = invoice.id
            AND payment.company_id = :companyId
            AND payment.status = :paymentStatus
            AND payment.payment_date <= :asOfDate
            AND payment.deleted_at IS NULL)`,
        'paymentsApplied',
      )
      .addSelect(
        `(SELECT COALESCE(SUM(sales_return.grand_total), 0)
          FROM sales_returns sales_return
          WHERE sales_return.sales_invoice_id = invoice.id
            AND sales_return.company_id = :companyId
            AND sales_return.status = :returnStatus
            AND sales_return.return_date <= :asOfDate
            AND sales_return.deleted_at IS NULL)`,
        'salesReturnsApplied',
      )
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.invoiceDate <= :asOfDate', {
        asOfDate: filter.asOfDate,
      })
      .andWhere('invoice.status IN (:...invoiceStatuses)', {
        invoiceStatuses: [
          SalesInvoiceStatus.POSTED,
          SalesInvoiceStatus.PARTIALLY_PAID,
          SalesInvoiceStatus.PAID,
        ],
      })
      .andWhere('invoice.deletedAt IS NULL')
      .andWhere('customer.deletedAt IS NULL')
      .setParameter('paymentStatus', CustomerPaymentStatus.POSTED)
      .setParameter('returnStatus', SalesReturnStatus.POSTED)
      .orderBy('customer.name', 'ASC')
      .addOrderBy('invoice.dueDate', 'ASC', 'NULLS FIRST')
      .addOrderBy('invoice.invoiceDate', 'ASC');

    if (filter.customerId) {
      query.andWhere('invoice.customerId = :customerId', {
        customerId: filter.customerId,
      });
    }

    if (filter.currency) {
      query.andWhere('invoice.currency = :currency', {
        currency: filter.currency.toUpperCase(),
      });
    }

    return query.getRawMany<ReceivableRawRow>();
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

  private createEmptyBuckets(): ReceivableAgingBucketsDto {
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
    buckets: ReceivableAgingBucketsDto,
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
