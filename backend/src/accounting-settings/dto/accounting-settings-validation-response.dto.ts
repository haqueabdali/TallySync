import { ApiProperty } from '@nestjs/swagger';

export class AccountingSettingValidationItemDto {
  @ApiProperty()
  field!: string;

  @ApiProperty({ required: false, nullable: true })
  accountId!: string | null;

  @ApiProperty()
  isConfigured!: boolean;

  @ApiProperty()
  isValid!: boolean;

  @ApiProperty({ required: false, nullable: true })
  message!: string | null;
}

export class AccountingSettingsValidationResponseDto {
  @ApiProperty()
  isComplete!: boolean;

  @ApiProperty({
    type: AccountingSettingValidationItemDto,
    isArray: true,
  })
  items!: AccountingSettingValidationItemDto[];
}
