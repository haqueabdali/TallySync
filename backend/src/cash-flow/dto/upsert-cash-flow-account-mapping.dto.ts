import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { CashFlowActivity } from '../enums/cash-flow-activity.enum';

export class UpsertCashFlowAccountMappingDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiProperty({ enum: CashFlowActivity })
  @IsEnum(CashFlowActivity)
  activity!: CashFlowActivity;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
