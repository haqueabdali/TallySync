export interface MrpPlanningRow {
  itemId: string;
  itemName: string;
  sku: string | null;
  unit: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHandQuantity: number;
  reorderLevel: number;
  shortageQuantity: number;
  recommendedReplenishmentQuantity: number;
  averageUnitCost: number;
  estimatedReplenishmentValue: number;
}
