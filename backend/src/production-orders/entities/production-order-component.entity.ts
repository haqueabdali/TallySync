import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { ProductionOrderEntity } from './production-order.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => value === null ? null : Number(value),
};

@Entity('production_order_components')
@Index('idx_production_order_components_order_id', ['productionOrderId'])
@Index('idx_production_order_components_item_id', ['componentItemId'])
@Index('uq_production_order_component_item', ['productionOrderId', 'componentItemId'], { unique: true })
@Check('chk_production_order_component_required_positive', '"required_quantity" > 0')
@Check('chk_production_order_component_consumed_non_negative', '"consumed_quantity" >= 0')
export class ProductionOrderComponentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string;

  @Column({ name: 'component_item_id', type: 'uuid' })
  componentItemId!: string;

  @Column({ name: 'bom_quantity', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  bomQuantity!: number;

  @Column({ name: 'scrap_percentage', type: 'numeric', precision: 7, scale: 4, default: 0, transformer: numericTransformer })
  scrapPercentage!: number;

  @Column({ name: 'required_quantity', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  requiredQuantity!: number;

  @Column({ name: 'consumed_quantity', type: 'numeric', precision: 18, scale: 6, default: 0, transformer: numericTransformer })
  consumedQuantity!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ProductionOrderEntity, (order) => order.components, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'production_order_id' })
  productionOrder!: ProductionOrderEntity;

  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'component_item_id' })
  componentItem!: ItemEntity;
}
