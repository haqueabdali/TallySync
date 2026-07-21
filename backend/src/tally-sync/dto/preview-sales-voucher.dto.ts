import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PreviewSalesVoucherItemDto {
  
  godownName?: string;
  
  @IsString()
  @IsNotEmpty()
  stockItemName: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  rate: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  
}

export class PreviewSalesVoucherDto {
  @IsString()
  @IsNotEmpty()
  voucherNumber: string;

  @IsDateString()
  voucherDate: string;

  @IsString()
  @IsNotEmpty()
  customerLedgerName: string;

  @IsString()
  @IsNotEmpty()
  salesLedgerName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreviewSalesVoucherItemDto)
  items: PreviewSalesVoucherItemDto[];


}