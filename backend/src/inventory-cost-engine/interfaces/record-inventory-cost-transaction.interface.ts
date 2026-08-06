import type { EntityManager } from 'typeorm';
import type { InventoryCostSourceType } from '../enums/inventory-cost-source-type.enum';
import type { InventoryCostTransactionType } from '../enums/inventory-cost-transaction-type.enum';

export interface RecordInventoryCostTransactionInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  transactionDate: string;
  transactionType: InventoryCostTransactionType;
  sourceType: InventoryCostSourceType;
  sourceId: string;
  sourceLineId: string;
  quantity: number;
  unitCost: number;
  createdBy?: string | null;
}

export interface InventoryCostExecutionOptions {
  manager?: EntityManager;
}
