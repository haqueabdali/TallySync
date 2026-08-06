import { BadRequestException, ConflictException } from '@nestjs/common';
import { MovingAverageCalculator } from './moving-average-calculator';

describe('MovingAverageCalculator', () => {
  const calculator = new MovingAverageCalculator();

  it('calculates a weighted-average receipt', () => {
    expect(
      calculator.calculateReceipt(
        { quantity: 10, averageUnitCost: 5, inventoryValue: 50 },
        10,
        7,
      ),
    ).toEqual({
      quantity: 10,
      unitCost: 7,
      totalCost: 70,
      quantityAfter: 20,
      averageUnitCostAfter: 6,
      inventoryValueAfter: 120,
    });
  });

  it('issues inventory using the current moving-average cost', () => {
    expect(
      calculator.calculateIssue(
        { quantity: 20, averageUnitCost: 6, inventoryValue: 120 },
        5,
      ),
    ).toEqual({
      quantity: 5,
      unitCost: 6,
      totalCost: 30,
      quantityAfter: 15,
      averageUnitCostAfter: 6,
      inventoryValueAfter: 90,
    });
  });

  it('resets cost and value when the remaining quantity is zero', () => {
    expect(
      calculator.calculateIssue(
        { quantity: 5, averageUnitCost: 6, inventoryValue: 30 },
        5,
      ),
    ).toEqual({
      quantity: 5,
      unitCost: 6,
      totalCost: 30,
      quantityAfter: 0,
      averageUnitCostAfter: 0,
      inventoryValueAfter: 0,
    });
  });

  it('rejects an issue greater than available stock', () => {
    expect(() =>
      calculator.calculateIssue(
        { quantity: 5, averageUnitCost: 6, inventoryValue: 30 },
        6,
      ),
    ).toThrow(ConflictException);
  });

  it('rejects invalid quantities and costs', () => {
    expect(() =>
      calculator.calculateReceipt(
        { quantity: 0, averageUnitCost: 0, inventoryValue: 0 },
        0,
        5,
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      calculator.calculateReceipt(
        { quantity: 0, averageUnitCost: 0, inventoryValue: 0 },
        1,
        -1,
      ),
    ).toThrow(BadRequestException);
  });
});
