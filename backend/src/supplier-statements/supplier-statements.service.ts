import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { PurchaseReturn } from '../purchase-returns/entities/purchase-return.entity';
import { PurchaseReturnStatus } from '../purchase-returns/enums/purchase-return-status.enum';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { SupplierPaymentStatus } from '../supplier-payments/enums/supplier-payment-status.enum';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierStatementFilterDto } from './dto/supplier-statement-filter.dto';
import {
  SupplierStatementResponseDto,
  SupplierStatementTransactionDto,
  SupplierStatementTransactionType,
} from './dto/supplier-statement-response.dto';

interface StatementMovement {
  id: string;
  type: SupplierStatementTransactionType;
  date: string;
  documentNumber: string;
  reference: string | null;
  description: string;
  debit: number;
  credit: number;
  sortOrder: number;
}

@Injectable()
export class SupplierStatementsService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentRepository: Repository<SupplierPayment>,
    @InjectRepository(PurchaseReturn)
    private readonly purchaseReturnRepository: Repository<PurchaseReturn>,
  ) {}

  async getStatement(
    filter: SupplierStatementFilterDto,
    companyId: string,
  ): Promise<SupplierStatementResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const supplier = await this.supplierRepository.findOne({
      where: {
        id: filter.supplierId,
        companyId,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const currency = filter.currency?.toUpperCase() ?? supplier.currency;
    const openingMovements = await this.loadMovements(
      companyId,
      filter.supplierId,
      currency,
      undefined,
      this.previousDate(filter.dateFrom),
    );
    const periodMovements = await this.loadMovements(
      companyId,
      filter.supplierId,
      currency,
      filter.dateFrom,
      filter.dateTo,
    );

    const openingBalance = this.round(
      openingMovements.reduce(
        (total, movement) => total + movement.credit - movement.debit,
        0,
      ),
    );

    let runningBalance = openingBalance;
    const transactions: SupplierStatementTransactionDto[] = periodMovements.map(
      (movement) => {
        runningBalance = this.round(
          runningBalance + movement.credit - movement.debit,
        );

        return {
          id: movement.id,
          type: movement.type,
          date: movement.date,
          documentNumber: movement.documentNumber,
          reference: movement.reference,
          description: movement.description,
          debit: movement.debit,
          credit: movement.credit,
          runningBalance,
        };
      },
    );

    const periodDebits = this.round(
      periodMovements.reduce((total, movement) => total + movement.debit, 0),
    );
    const periodCredits = this.round(
      periodMovements.reduce((total, movement) => total + movement.credit, 0),
    );
    const closingBalance = this.round(
      openingBalance + periodCredits - periodDebits,
    );
    const offset = (filter.page - 1) * filter.limit;

    return {
      supplierId: supplier.id,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      currency,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      openingBalance,
      periodDebits,
      periodCredits,
      closingBalance,
      transactions: transactions.slice(offset, offset + filter.limit),
      pagination: {
        page: filter.page,
        limit: filter.limit,
        totalTransactions: transactions.length,
        totalPages: Math.ceil(transactions.length / filter.limit),
      },
    };
  }

  private async loadMovements(
    companyId: string,
    supplierId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const [invoices, payments, returns] = await Promise.all([
      this.loadInvoices(companyId, supplierId, currency, dateFrom, dateTo),
      this.loadPayments(companyId, supplierId, currency, dateFrom, dateTo),
      this.loadReturns(companyId, supplierId, currency, dateFrom, dateTo),
    ]);

    return [...invoices, ...payments, ...returns].sort((left, right) => {
      const dateComparison = left.date.localeCompare(right.date);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      const orderComparison = left.sortOrder - right.sortOrder;
      if (orderComparison !== 0) {
        return orderComparison;
      }

      return left.documentNumber.localeCompare(right.documentNumber);
    });
  }

  private async loadInvoices(
    companyId: string,
    supplierId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const query = this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.supplierId = :supplierId', { supplierId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          PurchaseInvoiceStatus.POSTED,
          PurchaseInvoiceStatus.PARTIALLY_PAID,
          PurchaseInvoiceStatus.PAID,
        ],
      })
      .andWhere('invoice.invoiceDate <= :dateTo', { dateTo })
      .andWhere('invoice.deletedAt IS NULL');

    if (dateFrom) {
      query.andWhere('invoice.invoiceDate >= :dateFrom', { dateFrom });
    }

    const rows = await query.getMany();
    return rows.map((invoice) => ({
      id: invoice.id,
      type: SupplierStatementTransactionType.PURCHASE_INVOICE,
      date: invoice.invoiceDate,
      documentNumber: invoice.invoiceNumber,
      reference: invoice.supplierInvoiceNumber,
      description: `Purchase invoice ${invoice.invoiceNumber}`,
      debit: 0,
      credit: this.round(invoice.grandTotal),
      sortOrder: 1,
    }));
  }

  private async loadPayments(
    companyId: string,
    supplierId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const query = this.supplierPaymentRepository
      .createQueryBuilder('payment')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.supplierId = :supplierId', { supplierId })
      .andWhere('payment.currency = :currency', { currency })
      .andWhere('payment.status = :status', {
        status: SupplierPaymentStatus.POSTED,
      })
      .andWhere('payment.paymentDate <= :dateTo', { dateTo })
      .andWhere('payment.deletedAt IS NULL');

    if (dateFrom) {
      query.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
    }

    const rows = await query.getMany();
    return rows.map((payment) => ({
      id: payment.id,
      type: SupplierStatementTransactionType.SUPPLIER_PAYMENT,
      date: payment.paymentDate,
      documentNumber: payment.paymentNumber,
      reference: payment.referenceNumber,
      description: `Supplier payment ${payment.paymentNumber}`,
      debit: this.round(payment.amount),
      credit: 0,
      sortOrder: 2,
    }));
  }

  private async loadReturns(
    companyId: string,
    supplierId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const query = this.purchaseReturnRepository
      .createQueryBuilder('purchaseReturn')
      .where('purchaseReturn.companyId = :companyId', { companyId })
      .andWhere('purchaseReturn.supplierId = :supplierId', { supplierId })
      .andWhere('purchaseReturn.currency = :currency', { currency })
      .andWhere('purchaseReturn.status = :status', {
        status: PurchaseReturnStatus.Posted,
      })
      .andWhere('purchaseReturn.returnDate <= :dateTo', { dateTo })
      .andWhere('purchaseReturn.deletedAt IS NULL');

    if (dateFrom) {
      query.andWhere('purchaseReturn.returnDate >= :dateFrom', { dateFrom });
    }

    const rows = await query.getMany();
    return rows.map((purchaseReturn) => ({
      id: purchaseReturn.id,
      type: SupplierStatementTransactionType.PURCHASE_RETURN,
      date: purchaseReturn.returnDate,
      documentNumber: purchaseReturn.returnNumber,
      reference: purchaseReturn.purchaseInvoiceId,
      description: `Purchase return ${purchaseReturn.returnNumber}`,
      debit: this.round(purchaseReturn.grandTotal),
      credit: 0,
      sortOrder: 3,
    }));
  }

  private validateDateRange(dateFrom: string, dateTo: string): void {
    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }
  }

  private previousDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    parsed.setUTCDate(parsed.getUTCDate() - 1);
    return parsed.toISOString().slice(0, 10);
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
