import type { EntityManager } from 'typeorm';
import type { InventoryCostSourceType } from '../../enums/inventory-cost-source-type.enum';

interface MovingAverageBaseInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  transactionDate: string;
  sourceType: InventoryCostSourceType;
  sourceId: string;
  sourceLineId: string;
  quantity: number;
  createdBy?: string | null;
}

export interface RecordMovingAverageReceiptInput extends MovingAverageBaseInput {
  unitCost: number;
}

export type RecordMovingAverageIssueInput = MovingAverageBaseInput;

export interface MovingAverageExecutionOptions {
  manager?: EntityManager;
}

export interface MovingAverageBalanceSnapshot {
  quantity: number;
  averageUnitCost: number;
  inventoryValue: number;
}

export interface MovingAverageCalculationResult {
  quantity: number;
  unitCost: number;
  totalCost: number;
  quantityAfter: number;
  averageUnitCostAfter: number;
  inventoryValueAfter: number;
}
