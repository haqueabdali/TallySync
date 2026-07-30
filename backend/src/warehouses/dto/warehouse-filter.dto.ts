import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export const WAREHOUSE_SORT_FIELDS=['name','warehouseCode','city','country','createdAt','updatedAt'] as const;
export type WarehouseSortField=(typeof WAREHOUSE_SORT_FIELDS)[number];
export type WarehouseSortOrder='ASC'|'DESC';
const toBoolean=({value}:{value:unknown}):unknown=>value===true||value==='true'?true:value===false||value==='false'?false:value;
export class WarehouseFilterDto {
 @ApiPropertyOptional({default:1}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) page=1;
 @ApiPropertyOptional({default:20}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit=20;
 @ApiPropertyOptional() @IsOptional() @IsString() search?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() city?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() country?:string;
 @ApiPropertyOptional({type:Boolean}) @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?:boolean;
 @ApiPropertyOptional({type:Boolean}) @IsOptional() @Transform(toBoolean) @IsBoolean() isDefault?:boolean;
 @ApiPropertyOptional({enum:WAREHOUSE_SORT_FIELDS,default:'createdAt'}) @IsOptional() @IsIn(WAREHOUSE_SORT_FIELDS) sortBy:WarehouseSortField='createdAt';
 @ApiPropertyOptional({enum:['ASC','DESC'],default:'DESC'}) @IsOptional() @IsIn(['ASC','DESC']) sortOrder:WarehouseSortOrder='DESC';
}
