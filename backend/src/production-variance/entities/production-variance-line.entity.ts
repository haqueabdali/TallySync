import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';
import { ItemEntity } from '../../inventory/entities/item.entity';
import { ProductionOrderComponentEntity } from '../../production-orders/entities/production-order-component.entity';
import { ProductionVarianceEntity } from './production-variance.entity';
const numericTransformer: ValueTransformer = { to: (value: number | null | undefined) => value, from: (value: string | number | null) => value === null ? null : Number(value) };
@Entity('production_variance_lines')
@Index('uq_production_variance_line_component', ['productionVarianceId', 'productionOrderComponentId'], { unique: true })
export class ProductionVarianceLineEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'production_variance_id', type: 'uuid' }) productionVarianceId!: string;
  @Column({ name: 'production_order_component_id', type: 'uuid' }) productionOrderComponentId!: string;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ name: 'required_quantity', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) requiredQuantity!: number;
  @Column({ name: 'consumed_quantity', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) consumedQuantity!: number;
  @Column({ name: 'quantity_variance', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer }) quantityVariance!: number;
  @Column({ name: 'actual_cost', type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer }) actualCost!: number;
  @ManyToOne(() => ProductionVarianceEntity, (variance) => variance.lines, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'production_variance_id' }) productionVariance!: ProductionVarianceEntity;
  @ManyToOne(() => ProductionOrderComponentEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'production_order_component_id' }) productionOrderComponent!: ProductionOrderComponentEntity;
  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' }) item!: ItemEntity;
}
