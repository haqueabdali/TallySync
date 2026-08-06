export interface MrpPlanningCalculationInput {
  onHandQuantity: number;
  reorderLevel: number;
  averageUnitCost: number;
}

export interface MrpPlanningCalculationResult {
  shortageQuantity: number;
  recommendedReplenishmentQuantity: number;
  estimatedReplenishmentValue: number;
}

const round = (value: number, scale: number): number => {
  const factor = 10 ** scale;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const calculateMrpRecommendation = (
  input: MrpPlanningCalculationInput,
): MrpPlanningCalculationResult => {
  const onHandQuantity = Math.max(0, input.onHandQuantity);
  const reorderLevel = Math.max(0, input.reorderLevel);
  const averageUnitCost = Math.max(0, input.averageUnitCost);
  const shortageQuantity = Math.max(0, reorderLevel - onHandQuantity);
  const recommendedReplenishmentQuantity = round(shortageQuantity, 4);

  return {
    shortageQuantity: round(shortageQuantity, 4),
    recommendedReplenishmentQuantity,
    estimatedReplenishmentValue: round(
      recommendedReplenishmentQuantity * averageUnitCost,
      4,
    ),
  };
};
