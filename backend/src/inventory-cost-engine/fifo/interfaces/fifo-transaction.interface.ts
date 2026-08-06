import type { EntityManager } from 'typeorm';
import type { InventoryCostSourceType } from '../../enums/inventory-cost-source-type.enum';

interface FifoBaseInput {
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

export interface RecordFifoReceiptInput extends FifoBaseInput {
  unitCost: number;
}

export type RecordFifoIssueInput = FifoBaseInput;

export interface FifoExecutionOptions {
  manager?: EntityManager;
}

export interface FifoLayerSnapshot {
  id: string;
  remainingQuantity: number;
  unitCost: number;
}

export interface FifoAllocationResult {
  costLayerId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}
