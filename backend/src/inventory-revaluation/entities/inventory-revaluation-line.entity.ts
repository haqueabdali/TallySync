import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';
import { InventoryRevaluationEntity } from './inventory-revaluation.entity';
const numericTransformer: ValueTransformer = { to: (value: number): number => value, from: (value: string | number): number => Number(value) };
@Entity('inventory_revaluation_lines')
@Index('UQ_inventory_revaluation_lines_item_warehouse', ['revaluationId', 'itemId', 'warehouseId'], { unique: true })
export class InventoryRevaluationLineEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'revaluation_id', type: 'uuid' }) revaluationId!: string;
  @ManyToOne(() => InventoryRevaluationEntity, (revaluation) => revaluation.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'revaluation_id' }) revaluation!: InventoryRevaluationEntity;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ name: 'warehouse_id', type: 'uuid' }) warehouseId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) quantity!: number;
  @Column({ name: 'old_unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) oldUnitCost!: number;
  @Column({ name: 'new_unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) newUnitCost!: number;
  @Column({ name: 'old_value', type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) oldValue!: number;
  @Column({ name: 'new_value', type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) newValue!: number;
  @Column({ name: 'adjustment_amount', type: 'numeric', precision: 18, scale: 4, transformer: numericTransformer }) adjustmentAmount!: number;
}
