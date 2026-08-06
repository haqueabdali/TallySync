import { DepreciationMethod } from '../asset-management/enums/depreciation-method.enum';
import { calculateDepreciation } from './depreciation-calculator';
describe('calculateDepreciation', () => {
  it('calculates straight-line depreciation and caps at residual value', () => {
    const result = calculateDepreciation({ acquisitionCost: 1200, residualValue: 0, usefulLifeMonths: 12, method: DepreciationMethod.STRAIGHT_LINE, decliningBalanceRate: null, openingAccumulatedDepreciation: 1100, monthsToDepreciate: 2 });
    expect(result.amount).toBe(100);
    expect(result.closingNetBookValue).toBe(0);
  });
  it('calculates declining-balance depreciation monthly', () => {
    const result = calculateDepreciation({ acquisitionCost: 1200, residualValue: 100, usefulLifeMonths: 60, method: DepreciationMethod.DECLINING_BALANCE, decliningBalanceRate: 20, openingAccumulatedDepreciation: 0, monthsToDepreciate: 1 });
    expect(result.amount).toBe(20);
    expect(result.closingNetBookValue).toBe(1180);
  });
});
