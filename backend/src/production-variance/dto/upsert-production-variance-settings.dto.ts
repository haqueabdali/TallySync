import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
export class UpsertProductionVarianceSettingsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() favorableVarianceAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() unfavorableVarianceAccountId!: string;
}
