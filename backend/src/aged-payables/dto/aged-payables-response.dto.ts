import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayableAgingBucketsDto {
  @ApiProperty()
  notYetDue!: number;

  @ApiProperty()
  days1To30!: number;

  @ApiProperty()
  days31To60!: number;

  @ApiProperty()
  days61To90!: number;

  @ApiProperty()
  days91To120!: number;

  @ApiProperty()
  over120Days!: number;

  @ApiProperty()
  total!: number;
}

export class AgedPayableInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  invoiceId!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  supplierInvoiceNumber!: string | null;

  @ApiProperty()
  invoiceDate!: string;

  @ApiPropertyOptional({ nullable: true })
  dueDate!: string | null;

  @ApiProperty()
  daysPastDue!: number;

  @ApiProperty()
  originalAmount!: number;

  @ApiProperty()
  paymentsApplied!: number;

  @ApiProperty()
  purchaseReturnsApplied!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty()
  bucket!: keyof Omit<PayableAgingBucketsDto, 'total'>;
}

export class AgedPayableSupplierDto {
  @ApiProperty({ format: 'uuid' })
  supplierId!: string;

  @ApiProperty()
  supplierCode!: string;

  @ApiProperty()
  supplierName!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: PayableAgingBucketsDto })
  buckets!: PayableAgingBucketsDto;

  @ApiProperty({ type: [AgedPayableInvoiceDto] })
  invoices!: AgedPayableInvoiceDto[];
}

export class AgedPayablesPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalSuppliers!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AgedPayablesResponseDto {
  @ApiProperty()
  asOfDate!: string;

  @ApiPropertyOptional({ nullable: true })
  currency!: string | null;

  @ApiProperty({ type: PayableAgingBucketsDto })
  totals!: PayableAgingBucketsDto;

  @ApiProperty({ type: [AgedPayableSupplierDto] })
  suppliers!: AgedPayableSupplierDto[];

  @ApiProperty({ type: AgedPayablesPaginationDto })
  pagination!: AgedPayablesPaginationDto;
}
