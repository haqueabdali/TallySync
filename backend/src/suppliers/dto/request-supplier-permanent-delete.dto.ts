import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestSupplierPermanentDeleteDto {
  @ApiPropertyOptional({
    example: 'Duplicate supplier created by mistake',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
