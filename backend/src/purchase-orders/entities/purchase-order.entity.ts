import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';
import { PurchaseOrderItemEntity } from './purchase-order-item.entity';

const decimalTransformer = {
  to: (value: number | null | undefined): number | null => value ?? null,
  from: (value: string | number | null): number | null => value === null ? null : Number(value),
};

@Entity('purchase_orders')
@Index('IDX_purchase_orders_company', ['companyId'])
@Index('IDX_purchase_orders_supplier', ['supplierId'])
@Index('IDX_purchase_orders_warehouse', ['warehouseId'])
@Index('UQ_purchase_orders_company_number', ['companyId', 'poNumber'], { unique: true, where: '"deleted_at" IS NULL' })
export class PurchaseOrderEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'supplier_id', type: 'uuid' }) supplierId!: string;
  @Column({ name: 'warehouse_id', type: 'uuid' }) warehouseId!: string;
  @Column({ name: 'po_number', type: 'varchar', length: 40 }) poNumber!: string;
  @Column({ name: 'po_date', type: 'date' }) poDate!: string;
  @Column({ name: 'expected_date', type: 'date', nullable: true }) expectedDate!: string | null;
  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT }) status!: PurchaseOrderStatus;
  @Column({ type: 'varchar', length: 3, default: 'EUR' }) currency!: string;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) subtotal!: number;
  @Column({ name: 'discount_total', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) discountTotal!: number;
  @Column({ name: 'tax_total', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) taxTotal!: number;
  @Column({ name: 'shipping_total', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) shippingTotal!: number;
  @Column({ name: 'grand_total', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) grandTotal!: number;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @OneToMany(() => PurchaseOrderItemEntity, (item) => item.purchaseOrder, { cascade: ['insert', 'update'], eager: true }) items!: PurchaseOrderItemEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
