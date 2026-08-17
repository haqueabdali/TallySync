import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpsertWipAccountingSettingsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  wipAccountId!: string;
}
