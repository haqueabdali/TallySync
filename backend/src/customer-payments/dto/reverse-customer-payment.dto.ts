import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReverseCustomerPaymentDto {
  @ApiProperty({
    example: 'Payment entered against the wrong customer.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reversalReason!: string;
}
