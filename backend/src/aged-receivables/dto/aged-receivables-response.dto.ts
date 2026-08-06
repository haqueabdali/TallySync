import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceivableAgingBucketsDto {
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

export class AgedReceivableInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  invoiceId!: string;

  @ApiProperty()
  invoiceNumber!: string;

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
  salesReturnsApplied!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty()
  bucket!: keyof Omit<ReceivableAgingBucketsDto, 'total'>;
}

export class AgedReceivableCustomerDto {
  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: ReceivableAgingBucketsDto })
  buckets!: ReceivableAgingBucketsDto;

  @ApiProperty({ type: [AgedReceivableInvoiceDto] })
  invoices!: AgedReceivableInvoiceDto[];
}

export class AgedReceivablesPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalCustomers!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AgedReceivablesResponseDto {
  @ApiProperty()
  asOfDate!: string;

  @ApiPropertyOptional({ nullable: true })
  currency!: string | null;

  @ApiProperty({ type: ReceivableAgingBucketsDto })
  totals!: ReceivableAgingBucketsDto;

  @ApiProperty({ type: [AgedReceivableCustomerDto] })
  customers!: AgedReceivableCustomerDto[];

  @ApiProperty({ type: AgedReceivablesPaginationDto })
  pagination!: AgedReceivablesPaginationDto;
}
