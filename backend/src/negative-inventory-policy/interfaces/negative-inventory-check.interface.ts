export interface NegativeInventoryCheckInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  currentQuantity: number;
  issueQuantity: number;
}

export interface NegativeInventoryDecision {
  allowed: boolean;
  projectedQuantity: number;
  mode: string;
  maxNegativeQuantity: number | null;
  policyId: string | null;
  reason: string | null;
}
