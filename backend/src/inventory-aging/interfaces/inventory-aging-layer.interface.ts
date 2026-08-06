export interface InventoryAgingMovement {
  id: string;
  transactionDate: Date;
  quantity: number;
  unitCost: number;
  totalCost: number;
  direction: 'in' | 'out';
}

export interface InventoryAgingRemainingLayer {
  transactionDate: Date;
  quantity: number;
  unitCost: number;
  value: number;
}

export interface InventoryAgingBucketResult {
  quantity: number;
  value: number;
}
