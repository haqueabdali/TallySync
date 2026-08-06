import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { CustomerPaymentStatus } from '../customer-payments/enums/customer-payment-status.enum';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceStatus } from '../sales-invoices/enums/sales-invoice-status.enum';
import { SalesReturnEntity } from '../sales-returns/entities/sales-return.entity';
import { SalesReturnStatus } from '../sales-returns/enums/sales-return-status.enum';
import { CustomerStatementFilterDto } from './dto/customer-statement-filter.dto';
import {
  CustomerStatementResponseDto,
  CustomerStatementTransactionDto,
  CustomerStatementTransactionType,
} from './dto/customer-statement-response.dto';

interface StatementMovement {
  id: string;
  type: CustomerStatementTransactionType;
  date: string;
  documentNumber: string;
  reference: string | null;
  description: string;
  debit: number;
  credit: number;
  sortOrder: number;
}

@Injectable()
export class CustomerStatementsService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,
    @InjectRepository(CustomerPaymentEntity)
    private readonly customerPaymentRepository: Repository<CustomerPaymentEntity>,
    @InjectRepository(SalesReturnEntity)
    private readonly salesReturnRepository: Repository<SalesReturnEntity>,
  ) {}

  async getStatement(
    filter: CustomerStatementFilterDto,
    companyId: string,
  ): Promise<CustomerStatementResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const customer = await this.customerRepository.findOne({
      where: {
        id: filter.customerId,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const currency = filter.currency?.toUpperCase() ?? 'EUR';
    const openingMovements = await this.loadMovements(
      companyId,
      filter.customerId,
      currency,
      undefined,
      this.previousDate(filter.dateFrom),
    );
    const periodMovements = await this.loadMovements(
      companyId,
      filter.customerId,
      currency,
      filter.dateFrom,
      filter.dateTo,
    );

    const openingBalance = this.round(
      openingMovements.reduce(
        (total, movement) => total + movement.debit - movement.credit,
        0,
      ),
    );

    let runningBalance = openingBalance;
    const transactions: CustomerStatementTransactionDto[] = periodMovements.map(
      (movement) => {
        runningBalance = this.round(
          runningBalance + movement.debit - movement.credit,
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
      openingBalance + periodDebits - periodCredits,
    );
    const offset = (filter.page - 1) * filter.limit;

    return {
      customerId: customer.id,
      customerName: customer.name,
      email: customer.email,
      phone: customer.phone,
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
    customerId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const [invoices, payments, returns] = await Promise.all([
      this.loadInvoices(companyId, customerId, currency, dateFrom, dateTo),
      this.loadPayments(companyId, customerId, currency, dateFrom, dateTo),
      this.loadReturns(companyId, customerId, currency, dateFrom, dateTo),
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
    customerId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const query = this.salesInvoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.customerId = :customerId', { customerId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          SalesInvoiceStatus.POSTED,
          SalesInvoiceStatus.PARTIALLY_PAID,
          SalesInvoiceStatus.PAID,
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
      type: CustomerStatementTransactionType.SALES_INVOICE,
      date: invoice.invoiceDate,
      documentNumber: invoice.invoiceNumber,
      reference: invoice.customerInvoiceReference,
      description: `Sales invoice ${invoice.invoiceNumber}`,
      debit: this.round(invoice.grandTotal),
      credit: 0,
      sortOrder: 1,
    }));
  }

  private async loadPayments(
    companyId: string,
    customerId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const query = this.customerPaymentRepository
      .createQueryBuilder('payment')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.customerId = :customerId', { customerId })
      .andWhere('payment.currency = :currency', { currency })
      .andWhere('payment.status = :status', {
        status: CustomerPaymentStatus.POSTED,
      })
      .andWhere('payment.paymentDate <= :dateTo', { dateTo })
      .andWhere('payment.deletedAt IS NULL');

    if (dateFrom) {
      query.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
    }

    const rows = await query.getMany();
    return rows.map((payment) => ({
      id: payment.id,
      type: CustomerStatementTransactionType.CUSTOMER_PAYMENT,
      date: payment.paymentDate,
      documentNumber: payment.paymentNumber,
      reference: payment.referenceNumber,
      description: `Customer payment ${payment.paymentNumber}`,
      debit: 0,
      credit: this.round(payment.amount),
      sortOrder: 2,
    }));
  }

  private async loadReturns(
    companyId: string,
    customerId: string,
    currency: string,
    dateFrom: string | undefined,
    dateTo: string,
  ): Promise<StatementMovement[]> {
    const query = this.salesReturnRepository
      .createQueryBuilder('salesReturn')
      .where('salesReturn.companyId = :companyId', { companyId })
      .andWhere('salesReturn.customerId = :customerId', { customerId })
      .andWhere('salesReturn.currency = :currency', { currency })
      .andWhere('salesReturn.status = :status', {
        status: SalesReturnStatus.POSTED,
      })
      .andWhere('salesReturn.returnDate <= :dateTo', { dateTo })
      .andWhere('salesReturn.deletedAt IS NULL');

    if (dateFrom) {
      query.andWhere('salesReturn.returnDate >= :dateFrom', { dateFrom });
    }

    const rows = await query.getMany();
    return rows.map((salesReturn) => ({
      id: salesReturn.id,
      type: CustomerStatementTransactionType.SALES_RETURN,
      date: salesReturn.returnDate,
      documentNumber: salesReturn.returnNumber,
      reference: salesReturn.salesInvoiceId,
      description: `Sales return ${salesReturn.returnNumber}`,
      debit: 0,
      credit: this.round(salesReturn.grandTotal),
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
