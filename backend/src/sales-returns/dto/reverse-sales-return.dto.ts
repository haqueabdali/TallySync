import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReverseSalesReturnDto {
  @ApiProperty({
    example: 'Return was posted against the wrong invoice.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reversalReason!: string;
}
