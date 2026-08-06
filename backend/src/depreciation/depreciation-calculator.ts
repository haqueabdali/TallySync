import { BadRequestException } from '@nestjs/common';
import { DepreciationMethod } from '../asset-management/enums/depreciation-method.enum';

export interface DepreciationCalculationInput {
  acquisitionCost: number;
  residualValue: number;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  decliningBalanceRate: number | null;
  openingAccumulatedDepreciation: number;
  monthsToDepreciate: number;
}
export interface DepreciationCalculationResult { amount: number; closingAccumulatedDepreciation: number; closingNetBookValue: number; }
const round = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
export function calculateDepreciation(input: DepreciationCalculationInput): DepreciationCalculationResult {
  const maximumDepreciation = round(input.acquisitionCost - input.residualValue);
  const remaining = round(maximumDepreciation - input.openingAccumulatedDepreciation);
  if (remaining <= 0 || input.monthsToDepreciate <= 0) return { amount: 0, closingAccumulatedDepreciation: round(input.openingAccumulatedDepreciation), closingNetBookValue: round(input.acquisitionCost - input.openingAccumulatedDepreciation) };
  let amount: number;
  if (input.method === DepreciationMethod.STRAIGHT_LINE) {
    amount = (maximumDepreciation / input.usefulLifeMonths) * input.monthsToDepreciate;
  } else {
    if (input.decliningBalanceRate === null || input.decliningBalanceRate <= 0) throw new BadRequestException('Declining-balance rate must be configured.');
    let bookValue = input.acquisitionCost - input.openingAccumulatedDepreciation;
    amount = 0;
    const monthlyRate = input.decliningBalanceRate / 100 / 12;
    for (let month = 0; month < input.monthsToDepreciate; month += 1) {
      const monthlyAmount = Math.min(bookValue * monthlyRate, bookValue - input.residualValue);
      if (monthlyAmount <= 0) break;
      amount += monthlyAmount;
      bookValue -= monthlyAmount;
    }
  }
  amount = Math.min(round(amount), remaining);
  const closingAccumulatedDepreciation = round(input.openingAccumulatedDepreciation + amount);
  return { amount, closingAccumulatedDepreciation, closingNetBookValue: round(input.acquisitionCost - closingAccumulatedDepreciation) };
}
