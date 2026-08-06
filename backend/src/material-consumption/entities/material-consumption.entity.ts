import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProductionOrderEntity } from '../../production-orders/entities/production-order.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { MaterialConsumptionStatus } from '../enums/material-consumption-status.enum';
import { MaterialConsumptionLineEntity } from './material-consumption-line.entity';

@Entity('material_consumptions')
@Index('idx_material_consumptions_company_id', ['companyId'])
@Index('idx_material_consumptions_production_order_id', ['productionOrderId'])
@Index('idx_material_consumptions_warehouse_id', ['warehouseId'])
@Index('uq_material_consumptions_company_number', ['companyId', 'consumptionNumber'], { unique: true })
export class MaterialConsumptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'consumption_number', type: 'varchar', length: 50 })
  consumptionNumber!: string;

  @Column({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'consumption_date', type: 'date' })
  consumptionDate!: string;

  @Column({
    type: 'enum',
    enum: MaterialConsumptionStatus,
    enumName: 'material_consumption_status_enum',
    default: MaterialConsumptionStatus.POSTED,
  })
  status!: MaterialConsumptionStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt!: Date | null;

  @Column({ name: 'reversed_by', type: 'uuid', nullable: true })
  reversedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ProductionOrderEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'production_order_id' })
  productionOrder!: ProductionOrderEntity;

  @ManyToOne(() => WarehouseEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @OneToMany(() => MaterialConsumptionLineEntity, (line) => line.consumption, {
    cascade: ['insert'],
  })
  lines!: MaterialConsumptionLineEntity[];
}
