import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AssetDisposalStatus } from '../enums/asset-disposal-status.enum';
export class AssetDisposalFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(AssetDisposalStatus) status?: AssetDisposalStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() assetId?: string;
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
