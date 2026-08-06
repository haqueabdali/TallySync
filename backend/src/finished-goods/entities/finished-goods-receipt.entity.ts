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
import { ProductionOrderEntity } from '../../production-orders/entities/production-order.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { FinishedGoodsReceiptStatus } from '../enums/finished-goods-receipt-status.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity('finished_goods_receipts')
@Index('idx_finished_goods_receipts_company_id', ['companyId'])
@Index('idx_finished_goods_receipts_production_order_id', ['productionOrderId'])
@Index('idx_finished_goods_receipts_item_id', ['itemId'])
@Index('idx_finished_goods_receipts_warehouse_id', ['warehouseId'])
@Index('uq_finished_goods_receipts_company_number', ['companyId', 'receiptNumber'], { unique: true })
@Check('chk_finished_goods_receipts_quantity_positive', '"quantity" > 0')
@Check('chk_finished_goods_receipts_unit_cost_non_negative', '"unit_cost" >= 0')
@Check('chk_finished_goods_receipts_total_cost_non_negative', '"total_cost" >= 0')
export class FinishedGoodsReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'receipt_number', type: 'varchar', length: 50 })
  receiptNumber!: string;

  @Column({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate!: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  quantity!: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  unitCost!: number;

  @Column({ name: 'total_cost', type: 'numeric', precision: 18, scale: 6, transformer: numericTransformer })
  totalCost!: number;

  @Column({
    type: 'enum',
    enum: FinishedGoodsReceiptStatus,
    enumName: 'finished_goods_receipt_status_enum',
    default: FinishedGoodsReceiptStatus.POSTED,
  })
  status!: FinishedGoodsReceiptStatus;

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

  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @ManyToOne(() => WarehouseEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;
}
