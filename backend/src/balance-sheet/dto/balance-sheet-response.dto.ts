import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BalanceSheetAccountLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: '1000' })
  accountCode!: string;

  @ApiProperty({ example: 'Cash at Bank' })
  accountName!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ example: 52000.25 })
  amount!: number;
}

export class BalanceSheetSectionResponseDto {
  @ApiProperty({ enum: ['asset', 'liability', 'equity'] })
  type!: 'asset' | 'liability' | 'equity';

  @ApiProperty({ type: [BalanceSheetAccountLineResponseDto] })
  lines!: BalanceSheetAccountLineResponseDto[];

  @ApiProperty({ example: 125000.5 })
  total!: number;
}

export class BalanceSheetEarningsResponseDto {
  @ApiProperty({ example: 150000 })
  cumulativeIncome!: number;

  @ApiProperty({ example: 105000 })
  cumulativeExpenses!: number;

  @ApiProperty({ example: 45000 })
  unclosedEarnings!: number;
}

export class BalanceSheetResponseDto {
  @ApiProperty({ example: '2026-12-31' })
  asOfDate!: string;

  @ApiPropertyOptional({ example: 'EUR', nullable: true })
  currency!: string | null;

  @ApiProperty({ type: BalanceSheetSectionResponseDto })
  assets!: BalanceSheetSectionResponseDto;

  @ApiProperty({ type: BalanceSheetSectionResponseDto })
  liabilities!: BalanceSheetSectionResponseDto;

  @ApiProperty({ type: BalanceSheetSectionResponseDto })
  equity!: BalanceSheetSectionResponseDto;

  @ApiProperty({ type: BalanceSheetEarningsResponseDto })
  earnings!: BalanceSheetEarningsResponseDto;

  @ApiProperty({ example: 250000 })
  totalAssets!: number;

  @ApiProperty({ example: 130000 })
  totalLiabilities!: number;

  @ApiProperty({ example: 75000 })
  totalEquityBeforeEarnings!: number;

  @ApiProperty({ example: 120000 })
  totalEquity!: number;

  @ApiProperty({ example: 250000 })
  totalLiabilitiesAndEquity!: number;

  @ApiProperty({ example: 0 })
  difference!: number;

  @ApiProperty({ example: true })
  isBalanced!: boolean;
}
