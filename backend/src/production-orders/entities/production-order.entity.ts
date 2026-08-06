import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

import { BillOfMaterialEntity } from '../../bill-of-materials/entities/bill-of-material.entity';
import { ItemEntity } from '../../inventory/entities/item.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { ProductionOrderStatus } from '../enums/production-order-status.enum';
import { ProductionOrderComponentEntity } from './production-order-component.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => value === null ? null : Number(value),
};

@Entity('production_orders')
@Index('idx_production_orders_company_id', ['companyId'])
@Index('idx_production_orders_bom_id', ['billOfMaterialId'])
@Index('idx_production_orders_finished_item_id', ['finishedItemId'])
@Index('idx_production_orders_warehouse_id', ['warehouseId'])
@Index('idx_production_orders_status', ['status'])
@Index('uq_production_orders_company_number', ['companyId', 'orderNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Check('chk_production_orders_planned_quantity_positive', '"planned_quantity" > 0')
@Check('chk_production_orders_completed_quantity_non_negative', '"completed_quantity" >= 0')
export class ProductionOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({ name: 'bill_of_material_id', type: 'uuid' })
  billOfMaterialId!: string;

  @Column({ name: 'finished_item_id', type: 'uuid' })
  finishedItemId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ type: 'enum', enum: ProductionOrderStatus, enumName: 'production_order_status_enum', default: ProductionOrderStatus.DRAFT })
  status!: ProductionOrderStatus;

  @Column({ name: 'planned_quantity', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  plannedQuantity!: number;

  @Column({ name: 'completed_quantity', type: 'numeric', precision: 18, scale: 6, default: 0, transformer: numericTransformer })
  completedQuantity!: number;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate!: string | null;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate!: string | null;

  @Column({ name: 'actual_start_date', type: 'timestamptz', nullable: true })
  actualStartDate!: Date | null;

  @Column({ name: 'actual_end_date', type: 'timestamptz', nullable: true })
  actualEndDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => BillOfMaterialEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bill_of_material_id' })
  billOfMaterial!: BillOfMaterialEntity;

  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'finished_item_id' })
  finishedItem!: ItemEntity;

  @ManyToOne(() => WarehouseEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @OneToMany(() => ProductionOrderComponentEntity, (component) => component.productionOrder, { cascade: ['insert'] })
  components!: ProductionOrderComponentEntity[];
}
