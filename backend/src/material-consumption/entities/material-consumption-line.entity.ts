import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  ValueTransformer,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { ProductionOrderComponentEntity } from '../../production-orders/entities/production-order-component.entity';
import { MaterialConsumptionEntity } from './material-consumption.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity('material_consumption_lines')
@Index('idx_material_consumption_lines_consumption_id', ['consumptionId'])
@Index('idx_material_consumption_lines_component_id', ['productionOrderComponentId'])
@Index('idx_material_consumption_lines_item_id', ['itemId'])
@Index('uq_material_consumption_component', ['consumptionId', 'productionOrderComponentId'], { unique: true })
@Check('chk_material_consumption_line_quantity_positive', '"quantity" > 0')
@Check('chk_material_consumption_line_cost_non_negative', '"unit_cost" >= 0 AND "total_cost" >= 0')
export class MaterialConsumptionLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'consumption_id', type: 'uuid' })
  consumptionId!: string;

  @Column({ name: 'production_order_component_id', type: 'uuid' })
  productionOrderComponentId!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  quantity!: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  unitCost!: number;

  @Column({ name: 'total_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  totalCost!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => MaterialConsumptionEntity, (consumption) => consumption.lines, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consumption_id' })
  consumption!: MaterialConsumptionEntity;

  @ManyToOne(() => ProductionOrderComponentEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'production_order_component_id' })
  productionOrderComponent!: ProductionOrderComponentEntity;

  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;
}
