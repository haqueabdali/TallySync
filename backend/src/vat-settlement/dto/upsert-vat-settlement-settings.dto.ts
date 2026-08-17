import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpsertVatSettlementSettingsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() outputVatAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() inputVatAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() vatPayableAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() vatReceivableAccountId!: string;
}
