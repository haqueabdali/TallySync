import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ProductionVarianceStatus } from '../enums/production-variance-status.enum';
export class ProductionVarianceFilterDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() productionOrderId?: string;
  @ApiPropertyOptional({ enum: ProductionVarianceStatus }) @IsOptional() @IsEnum(ProductionVarianceStatus) status?: ProductionVarianceStatus;
}
