import { ApiProperty } from '@nestjs/swagger';
import { SupplierPaymentMethod } from '../enums/supplier-payment-method.enum';
import { SupplierPaymentStatus } from '../enums/supplier-payment-status.enum';

export class SupplierPaymentAllocationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseInvoiceId!: string;
  @ApiProperty() allocatedAmount!: number;
  @ApiProperty() invoiceBalanceBefore!: number;
  @ApiProperty() invoiceBalanceAfter!: number;
}

export class SupplierPaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty() paymentNumber!: string;
  @ApiProperty() paymentDate!: string;
  @ApiProperty({ enum: SupplierPaymentMethod }) paymentMethod!: SupplierPaymentMethod;
  @ApiProperty({ enum: SupplierPaymentStatus }) status!: SupplierPaymentStatus;
  @ApiProperty() currency!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() allocatedAmount!: number;
  @ApiProperty() unallocatedAmount!: number;
  @ApiProperty({ required: false, nullable: true }) referenceNumber!: string | null;
  @ApiProperty({ required: false, nullable: true }) bankAccountName!: string | null;
  @ApiProperty({ required: false, nullable: true }) chequeNumber!: string | null;
  @ApiProperty({ required: false, nullable: true }) chequeDate!: string | null;
  @ApiProperty({ required: false, nullable: true }) notes!: string | null;
  @ApiProperty({ type: SupplierPaymentAllocationResponseDto, isArray: true })
  allocations!: SupplierPaymentAllocationResponseDto[];
  @ApiProperty({ required: false, nullable: true }) createdBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) updatedBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) postedBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) postedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true }) cancelledBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) cancelledAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ required: false, nullable: true }) deletedAt!: Date | null;
}

export class SupplierPaymentPaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class PaginatedSupplierPaymentsResponseDto {
  @ApiProperty({ type: SupplierPaymentResponseDto, isArray: true })
  data!: SupplierPaymentResponseDto[];

  @ApiProperty({ type: SupplierPaymentPaginationMetaDto })
  meta!: SupplierPaymentPaginationMetaDto;
}
