export interface InventoryValuationAmounts {
  quantity: number;
  inventoryValue: number;
  averageUnitCost: number;
}

export function calculateInventoryValuation(
  quantity: number,
  inventoryValue: number,
): InventoryValuationAmounts {
  const roundedQuantity = round(quantity, 4);
  const roundedValue = round(inventoryValue, 4);

  return {
    quantity: roundedQuantity,
    inventoryValue: roundedValue,
    averageUnitCost: roundedQuantity === 0 ? 0 : round(roundedValue / roundedQuantity, 6),
  };
}

function round(value: number, scale: number): number {
  const multiplier = 10 ** scale;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}
