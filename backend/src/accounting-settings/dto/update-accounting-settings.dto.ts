import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateAccountingSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountsReceivableAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountsPayableAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesRevenueAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesReturnsAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outputTaxAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inputTaxAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inventoryAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  costOfGoodsSoldAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cashAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cardClearingAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goodsReceivedNotInvoicedAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseExpenseAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roundingDifferenceAccountId?: string;

  @ApiPropertyOptional({
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostSalesInvoices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostCustomerPayments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostSalesReturns?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPostGoodsReceipts?: boolean;
}
