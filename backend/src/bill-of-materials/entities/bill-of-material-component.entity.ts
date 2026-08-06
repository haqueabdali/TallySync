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
import { BillOfMaterialEntity } from './bill-of-material.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};

@Entity('bill_of_material_components')
@Index('idx_bom_component_bom_id', ['billOfMaterialId'])
@Index('idx_bom_component_item_id', ['componentItemId'])
@Index('uq_bom_component_item', ['billOfMaterialId', 'componentItemId'], {
  unique: true,
})
@Check('chk_bom_component_quantity_positive', '"quantity" > 0')
@Check(
  'chk_bom_component_scrap_percentage_range',
  '"scrap_percentage" >= 0 AND "scrap_percentage" <= 100',
)
export class BillOfMaterialComponentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bill_of_material_id', type: 'uuid' })
  billOfMaterialId!: string;

  @Column({ name: 'component_item_id', type: 'uuid' })
  componentItemId!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numericTransformer,
  })
  quantity!: number;

  @Column({
    name: 'scrap_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  scrapPercentage!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BillOfMaterialEntity, (bom) => bom.components, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bill_of_material_id' })
  billOfMaterial!: BillOfMaterialEntity;

  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'component_item_id' })
  componentItem!: ItemEntity;
}
