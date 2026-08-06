import { ApiProperty } from '@nestjs/swagger';

export class AccountingSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ required: false, nullable: true })
  accountsReceivableAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  accountsPayableAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  salesRevenueAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  salesReturnsAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  outputTaxAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  inputTaxAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  inventoryAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  costOfGoodsSoldAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  cashAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  bankAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  cardClearingAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  goodsReceivedNotInvoicedAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  purchaseExpenseAccountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  roundingDifferenceAccountId!: string | null;

  @ApiProperty()
  defaultCurrency!: string;

  @ApiProperty()
  autoPostSalesInvoices!: boolean;

  @ApiProperty()
  autoPostCustomerPayments!: boolean;

  @ApiProperty()
  autoPostSalesReturns!: boolean;

  @ApiProperty()
  autoPostGoodsReceipts!: boolean;

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
