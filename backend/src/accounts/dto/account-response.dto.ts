import { ApiProperty } from '@nestjs/swagger';
import { AccountNormalBalance } from '../enums/account-normal-balance.enum';
import { AccountStatus } from '../enums/account-status.enum';
import { AccountType } from '../enums/account-type.enum';

export class AccountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: AccountType }) type!: AccountType;
  @ApiProperty({ enum: AccountNormalBalance }) normalBalance!: AccountNormalBalance;
  @ApiProperty({ enum: AccountStatus }) status!: AccountStatus;
  @ApiProperty({ required: false, nullable: true }) parentId!: string | null;
  @ApiProperty() isGroup!: boolean;
  @ApiProperty() isSystemAccount!: boolean;
  @ApiProperty() allowManualEntry!: boolean;
  @ApiProperty() currency!: string;
  @ApiProperty({ required: false, nullable: true }) description!: string | null;
  @ApiProperty({ required: false, nullable: true }) createdBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) updatedBy!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ required: false, nullable: true }) deletedAt!: Date | null;
}

export class AccountTreeNodeResponseDto extends AccountResponseDto {
  @ApiProperty({ type: () => [AccountTreeNodeResponseDto] })
  children!: AccountTreeNodeResponseDto[];
}

export class AccountPaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class PaginatedAccountsResponseDto {
  @ApiProperty({ type: AccountResponseDto, isArray: true })
  data!: AccountResponseDto[];

  @ApiProperty({ type: AccountPaginationMetaDto })
  meta!: AccountPaginationMetaDto;
}
