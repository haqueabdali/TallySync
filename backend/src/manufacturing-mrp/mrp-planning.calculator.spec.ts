import { calculateMrpRecommendation } from './mrp-planning.calculator';

describe('calculateMrpRecommendation', () => {
  it('recommends the shortage up to the reorder level', () => {
    expect(
      calculateMrpRecommendation({
        onHandQuantity: 4,
        reorderLevel: 10,
        averageUnitCost: 2.5,
      }),
    ).toEqual({
      shortageQuantity: 6,
      recommendedReplenishmentQuantity: 6,
      estimatedReplenishmentValue: 15,
    });
  });

  it('returns zero when stock is at or above the reorder level', () => {
    expect(
      calculateMrpRecommendation({
        onHandQuantity: 12,
        reorderLevel: 10,
        averageUnitCost: 2.5,
      }),
    ).toEqual({
      shortageQuantity: 0,
      recommendedReplenishmentQuantity: 0,
      estimatedReplenishmentValue: 0,
    });
  });

  it('does not produce negative recommendations', () => {
    expect(
      calculateMrpRecommendation({
        onHandQuantity: -2,
        reorderLevel: -1,
        averageUnitCost: -5,
      }),
    ).toEqual({
      shortageQuantity: 0,
      recommendedReplenishmentQuantity: 0,
      estimatedReplenishmentValue: 0,
    });
  });
});
