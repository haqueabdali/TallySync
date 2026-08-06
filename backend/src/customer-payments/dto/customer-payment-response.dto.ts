import { ApiProperty } from '@nestjs/swagger';

import { CustomerPaymentMethod } from '../enums/customer-payment-method.enum';
import { CustomerPaymentStatus } from '../enums/customer-payment-status.enum';

export class CustomerPaymentAllocationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salesInvoiceId!: string;

  @ApiProperty()
  allocatedAmount!: number;

  @ApiProperty()
  invoiceBalanceBefore!: number;

  @ApiProperty()
  invoiceBalanceAfter!: number;
}

export class CustomerPaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  paymentNumber!: string;

  @ApiProperty()
  paymentDate!: string;

  @ApiProperty({ enum: CustomerPaymentMethod })
  paymentMethod!: CustomerPaymentMethod;

  @ApiProperty({ enum: CustomerPaymentStatus })
  status!: CustomerPaymentStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  allocatedAmount!: number;

  @ApiProperty()
  unallocatedAmount!: number;

  @ApiProperty({ required: false, nullable: true })
  referenceNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  bankAccountName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  chequeNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  chequeDate!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({
    type: CustomerPaymentAllocationResponseDto,
    isArray: true,
  })
  allocations!: CustomerPaymentAllocationResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reversedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  reversedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reversalReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  deletedAt!: Date | null;
}

export class CustomerPaymentPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedCustomerPaymentsResponseDto {
  @ApiProperty({
    type: CustomerPaymentResponseDto,
    isArray: true,
  })
  data!: CustomerPaymentResponseDto[];

  @ApiProperty({
    type: CustomerPaymentPaginationMetaDto,
  })
  meta!: CustomerPaymentPaginationMetaDto;
}
