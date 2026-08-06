import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { BankReconciliationStatus } from '../enums/bank-reconciliation-status.enum';
export class BankReconciliationFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() bankAccountId?: string;
  @ApiPropertyOptional({ enum: BankReconciliationStatus }) @IsOptional() @IsEnum(BankReconciliationStatus) status?: BankReconciliationStatus;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
