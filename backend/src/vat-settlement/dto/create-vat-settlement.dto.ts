import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateVatSettlementDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() vatReturnId!: string;
  @ApiProperty({ example: '2026-09-30' }) @IsDateString() settlementDate!: string;
  @ApiPropertyOptional({ example: 'EUR', default: 'EUR' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
