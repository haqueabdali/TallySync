import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AccountLedgerFilterDto {
  @ApiPropertyOptional({ example: '2026-01-01' }) @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ example: 'customer' }) @IsOptional() @IsString() @MaxLength(30) partyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() partyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) costCenter?: string;
}
