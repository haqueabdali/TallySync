import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PurchaseOrderEntity } from './purchase-order.entity';

const decimalTransformer = {
  to: (value: number | null | undefined): number | null => value ?? null,
  from: (value: string | number | null): number | null => value === null ? null : Number(value),
};

@Entity('purchase_order_items')
@Index('IDX_purchase_order_items_order', ['purchaseOrderId'])
@Index('IDX_purchase_order_items_item', ['itemId'])
export class PurchaseOrderItemEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'purchase_order_id', type: 'uuid' }) purchaseOrderId!: string;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ type: 'varchar', length: 250, nullable: true }) description!: string | null;
  @Column({ type: 'decimal', precision: 18, scale: 4, transformer: decimalTransformer }) quantity!: number;
  @Column({ name: 'received_quantity', type: 'decimal', precision: 18, scale: 4, default: 0, transformer: decimalTransformer }) receivedQuantity!: number;
  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4, transformer: decimalTransformer }) unitPrice!: number;
  @Column({ name: 'discount_percent', type: 'decimal', precision: 7, scale: 4, default: 0, transformer: decimalTransformer }) discountPercent!: number;
  @Column({ name: 'tax_percent', type: 'decimal', precision: 7, scale: 4, default: 0, transformer: decimalTransformer }) taxPercent!: number;
  @Column({ name: 'line_subtotal', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) lineSubtotal!: number;
  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) discountAmount!: number;
  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) taxAmount!: number;
  @Column({ name: 'line_total', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) lineTotal!: number;
  @ManyToOne(() => PurchaseOrderEntity, (purchaseOrder) => purchaseOrder.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' }) purchaseOrder!: PurchaseOrderEntity;
}
