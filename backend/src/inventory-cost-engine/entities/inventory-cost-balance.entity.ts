import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity('inventory_cost_balances')
@Index('UQ_inventory_cost_balances_company_item_warehouse', ['companyId', 'itemId', 'warehouseId'], { unique: true })
@Index('IDX_inventory_cost_balances_company', ['companyId'])
@Index('IDX_inventory_cost_balances_item', ['itemId'])
@Index('IDX_inventory_cost_balances_warehouse', ['warehouseId'])
export class InventoryCostBalanceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ name: 'warehouse_id', type: 'uuid' }) warehouseId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numericTransformer }) quantity!: number;
  @Column({ name: 'average_unit_cost', type: 'numeric', precision: 18, scale: 6, default: 0, transformer: numericTransformer }) averageUnitCost!: number;
  @Column({ name: 'inventory_value', type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numericTransformer }) inventoryValue!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
