import { calculateInventoryValuation } from './inventory-valuation.calculator';

describe('calculateInventoryValuation', () => {
  it('calculates the average unit cost', () => {
    expect(calculateInventoryValuation(8, 86)).toEqual({
      quantity: 8,
      inventoryValue: 86,
      averageUnitCost: 10.75,
    });
  });

  it('returns zero average cost when quantity is zero', () => {
    expect(calculateInventoryValuation(0, 0)).toEqual({
      quantity: 0,
      inventoryValue: 0,
      averageUnitCost: 0,
    });
  });
});
