import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator';
export class CreateBankStatementLineDto {
  @ApiProperty() @IsDateString() transactionDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() valueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) externalTransactionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) amount!: number;
}
export class CreateBankReconciliationDto {
  @ApiProperty() @IsUUID() bankAccountId!: string;
  @ApiProperty() @IsString() @MaxLength(120) statementReference!: string;
  @ApiProperty() @IsDateString() statementStartDate!: string;
  @ApiProperty() @IsDateString() statementEndDate!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) openingBalance!: number;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) closingBalance!: number;
  @ApiPropertyOptional({ default: 'EUR' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiProperty({ type: [CreateBankStatementLineDto] }) @IsArray() @ArrayMaxSize(10000) @ValidateNested({ each: true }) @Type(() => CreateBankStatementLineDto) lines!: CreateBankStatementLineDto[];
}
