import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateBackgroundJobDto {
  @ApiProperty({ example: 'tally.sales-order.sync' })
  @IsString()
  @Length(1, 120)
  type!: string;

  @ApiPropertyOptional({ example: 'integrations' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  queue?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @ApiPropertyOptional({ minimum: -1000, maximum: 1000, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(-1000)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ example: '2026-08-07T02:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  availableAt?: string;

  @ApiPropertyOptional({ example: 'sales-order:uuid:sync' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  idempotencyKey?: string;
}
