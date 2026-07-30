import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const SUPPLIER_SORT_FIELDS = ['name','supplierCode','city','country','currentBalance','createdAt','updatedAt'] as const;
export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];
export type SupplierSortOrder = 'ASC' | 'DESC';
const toBoolean = ({ value }: { value: unknown }): unknown => value === 'true' ? true : value === 'false' ? false : value;

export class SupplierFilterDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional({ type: Boolean }) @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ enum: SUPPLIER_SORT_FIELDS, default: 'createdAt' }) @IsOptional() @IsIn(SUPPLIER_SORT_FIELDS) sortBy: SupplierSortField = 'createdAt';
  @ApiPropertyOptional({ enum: ['ASC','DESC'], default: 'DESC' }) @IsOptional() @IsIn(['ASC','DESC']) sortOrder: SupplierSortOrder = 'DESC';
}
