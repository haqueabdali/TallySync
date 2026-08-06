import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CustomerStatementTransactionType {
  SALES_INVOICE = 'sales_invoice',
  CUSTOMER_PAYMENT = 'customer_payment',
  SALES_RETURN = 'sales_return',
}

export class CustomerStatementTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CustomerStatementTransactionType })
  type!: CustomerStatementTransactionType;

  @ApiProperty({ example: '2026-08-01' })
  date!: string;

  @ApiProperty()
  documentNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  reference!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  debit!: number;

  @ApiProperty()
  credit!: number;

  @ApiProperty()
  runningBalance!: number;
}

export class CustomerStatementPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalTransactions!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CustomerStatementResponseDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '2026-01-01' })
  dateFrom!: string;

  @ApiProperty({ example: '2026-12-31' })
  dateTo!: string;

  @ApiProperty()
  openingBalance!: number;

  @ApiProperty()
  periodDebits!: number;

  @ApiProperty()
  periodCredits!: number;

  @ApiProperty()
  closingBalance!: number;

  @ApiProperty({ type: [CustomerStatementTransactionDto] })
  transactions!: CustomerStatementTransactionDto[];

  @ApiProperty({ type: CustomerStatementPaginationDto })
  pagination!: CustomerStatementPaginationDto;
}
