import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SupplierStatementTransactionType {
  PURCHASE_INVOICE = 'purchase_invoice',
  SUPPLIER_PAYMENT = 'supplier_payment',
  PURCHASE_RETURN = 'purchase_return',
}

export class SupplierStatementTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SupplierStatementTransactionType })
  type!: SupplierStatementTransactionType;

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

  @ApiProperty({ description: 'Positive amount represents payable to supplier' })
  runningBalance!: number;
}

export class SupplierStatementPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalTransactions!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SupplierStatementResponseDto {
  @ApiProperty()
  supplierId!: string;

  @ApiProperty()
  supplierCode!: string;

  @ApiProperty()
  supplierName!: string;

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

  @ApiProperty({ description: 'Positive amount represents payable to supplier' })
  openingBalance!: number;

  @ApiProperty()
  periodDebits!: number;

  @ApiProperty()
  periodCredits!: number;

  @ApiProperty({ description: 'Positive amount represents payable to supplier' })
  closingBalance!: number;

  @ApiProperty({ type: [SupplierStatementTransactionDto] })
  transactions!: SupplierStatementTransactionDto[];

  @ApiProperty({ type: SupplierStatementPaginationDto })
  pagination!: SupplierStatementPaginationDto;
}
