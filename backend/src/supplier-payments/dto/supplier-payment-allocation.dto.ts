import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class SupplierPaymentAllocationDto {
  @ApiProperty()
  @IsUUID()
  purchaseInvoiceId!: string;

  @ApiProperty({ minimum: 0.01, example: 250 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  allocatedAmount!: number;
}
