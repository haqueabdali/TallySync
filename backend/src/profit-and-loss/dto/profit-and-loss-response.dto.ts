import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfitAndLossAccountLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: '4000' })
  accountCode!: string;

  @ApiProperty({ example: 'Sales Revenue' })
  accountName!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ example: 125000.5 })
  amount!: number;
}

export class ProfitAndLossSectionResponseDto {
  @ApiProperty({ enum: ['income', 'expense'] })
  type!: 'income' | 'expense';

  @ApiProperty({ type: [ProfitAndLossAccountLineResponseDto] })
  lines!: ProfitAndLossAccountLineResponseDto[];

  @ApiProperty({ example: 125000.5 })
  total!: number;
}

export class ProfitAndLossResponseDto {
  @ApiProperty({ example: '2026-01-01' })
  dateFrom!: string;

  @ApiProperty({ example: '2026-12-31' })
  dateTo!: string;

  @ApiPropertyOptional({ example: 'EUR', nullable: true })
  currency!: string | null;

  @ApiProperty({ type: ProfitAndLossSectionResponseDto })
  income!: ProfitAndLossSectionResponseDto;

  @ApiProperty({ type: ProfitAndLossSectionResponseDto })
  expenses!: ProfitAndLossSectionResponseDto;

  @ApiProperty({ example: 125000.5 })
  totalIncome!: number;

  @ApiProperty({ example: 84000 })
  totalExpenses!: number;

  @ApiProperty({ example: 41000.5 })
  netProfit!: number;

  @ApiProperty({ example: true })
  isProfit!: boolean;
}
