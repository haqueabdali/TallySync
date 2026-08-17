import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';
import { ManualCostAdjustmentType } from '../enums/manual-cost-adjustment-type.enum';
import { ManualCostAdjustmentEntity } from './manual-cost-adjustment.entity';
const numberTransformer: ValueTransformer = { to: (value: number): number => value, from: (value: string | number): number => Number(value) };
@Entity('manual_cost_adjustment_lines')
@Index('IDX_manual_cost_adjustment_lines_adjustment', ['adjustmentId'])
export class ManualCostAdjustmentLineEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'adjustment_id', type: 'uuid' }) adjustmentId!: string;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ name: 'warehouse_id', type: 'uuid' }) warehouseId!: string;
  @Column({ name: 'adjustment_type', type: 'enum', enum: ManualCostAdjustmentType, enumName: 'manual_cost_adjustment_type_enum' }) adjustmentType!: ManualCostAdjustmentType;
  @Column({ name: 'quantity_change', type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numberTransformer }) quantityChange!: number;
  @Column({ name: 'value_change', type: 'numeric', precision: 18, scale: 4, transformer: numberTransformer }) valueChange!: number;
  @Column({ name: 'unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numberTransformer }) unitCost!: number;
  @Column({ name: 'old_quantity', type: 'numeric', precision: 18, scale: 4, transformer: numberTransformer }) oldQuantity!: number;
  @Column({ name: 'new_quantity', type: 'numeric', precision: 18, scale: 4, transformer: numberTransformer }) newQuantity!: number;
  @Column({ name: 'old_value', type: 'numeric', precision: 18, scale: 4, transformer: numberTransformer }) oldValue!: number;
  @Column({ name: 'new_value', type: 'numeric', precision: 18, scale: 4, transformer: numberTransformer }) newValue!: number;
  @Column({ name: 'old_average_unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numberTransformer }) oldAverageUnitCost!: number;
  @Column({ name: 'new_average_unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numberTransformer }) newAverageUnitCost!: number;
  @Column({ type: 'varchar', length: 500, nullable: true }) reason!: string | null;
  @ManyToOne(() => ManualCostAdjustmentEntity, (adjustment) => adjustment.lines, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'adjustment_id' }) adjustment!: ManualCostAdjustmentEntity;
}
