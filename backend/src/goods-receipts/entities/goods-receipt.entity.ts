import {
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
} from 'typeorm';

import { PurchaseOrderEntity } from '../../purchase-orders/entities/purchase-order.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { GoodsReceiptStatus } from '../enums/goods-receipt-status.enum';
import { GoodsReceiptItem } from './goods-receipt-item.entity';

@Entity('goods_receipts')
@Index('IDX_goods_receipts_company', ['companyId'])
@Index('IDX_goods_receipts_purchase_order', ['purchaseOrderId'])
@Index('IDX_goods_receipts_warehouse', ['warehouseId'])
@Index('UQ_goods_receipts_company_number', ['companyId', 'grnNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrderEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrderEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'grn_number', type: 'varchar', length: 40 })
  grnNumber!: string;

  @Column({ name: 'grn_date', type: 'date' })
  grnDate!: Date;

  @Column({
    type: 'enum',
    enum: GoodsReceiptStatus,
    default: GoodsReceiptStatus.Draft,
  })
  status!: GoodsReceiptStatus;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  items!: GoodsReceiptItem[];

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
}
