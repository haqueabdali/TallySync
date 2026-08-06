import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';
import { InventoryCostSourceType } from '../enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from '../enums/inventory-cost-transaction-type.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity('inventory_cost_transactions')
@Index('IDX_inventory_cost_transactions_company_date', ['companyId', 'transactionDate'])
@Index('IDX_inventory_cost_transactions_item_warehouse', ['itemId', 'warehouseId'])
@Index('UQ_inventory_cost_transactions_source_line', ['companyId', 'sourceType', 'sourceId', 'sourceLineId', 'transactionType'], { unique: true })
export class InventoryCostTransactionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ name: 'warehouse_id', type: 'uuid' }) warehouseId!: string;
  @Column({ name: 'transaction_date', type: 'date' }) transactionDate!: string;
  @Column({ name: 'transaction_type', type: 'enum', enum: InventoryCostTransactionType, enumName: 'inventory_cost_transaction_type_enum' }) transactionType!: InventoryCostTransactionType;
  @Column({ name: 'source_type', type: 'enum', enum: InventoryCostSourceType, enumName: 'inventory_cost_source_type_enum' }) sourceType!: InventoryCostSourceType;
  @Column({ name: 'source_id', type: 'uuid' }) sourceId!: string;
  @Column({ name: 'source_line_id', type: 'uuid' }) sourceLineId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) quantity!: number;
  @Column({ name: 'unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) unitCost!: number;
  @Column({ name: 'total_cost', type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) totalCost!: number;
  @Column({ name: 'quantity_after', type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) quantityAfter!: number;
  @Column({ name: 'average_unit_cost_after', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) averageUnitCostAfter!: number;
  @Column({ name: 'inventory_value_after', type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) inventoryValueAfter!: number;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
