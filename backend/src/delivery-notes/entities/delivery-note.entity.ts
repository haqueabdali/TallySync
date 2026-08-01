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

import { CustomerEntity } from '../../customers/entities/customer.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { SalesOrderEntity } from '../../sales-orders/entities/sales-order.entity';
import { DeliveryNoteStatus } from '../enums/delivery-note-status.enum';
import { DeliveryNoteItemEntity } from './delivery-note-item.entity';

@Entity('delivery_notes')
@Index('IDX_delivery_notes_company', ['companyId'])
@Index('IDX_delivery_notes_customer', ['customerId'])
@Index('IDX_delivery_notes_warehouse', ['warehouseId'])
@Index('IDX_delivery_notes_sales_order', ['salesOrderId'])
@Index('IDX_delivery_notes_status', ['companyId', 'status'])
@Index(
  'UQ_delivery_notes_company_number',
  ['companyId', 'deliveryNoteNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class DeliveryNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'sales_order_id', type: 'uuid' })
  salesOrderId!: string;

  @ManyToOne(() => SalesOrderEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder!: SalesOrderEntity;

  @Column({
    name: 'delivery_note_number',
    type: 'varchar',
    length: 50,
  })
  deliveryNoteNumber!: string;

  @Column({ name: 'delivery_date', type: 'date' })
  deliveryDate!: string;

  @Column({
    type: 'enum',
    enum: DeliveryNoteStatus,
    default: DeliveryNoteStatus.DRAFT,
  })
  status!: DeliveryNoteStatus;

  @Column({
    name: 'shipping_address',
    type: 'text',
    nullable: true,
  })
  shippingAddress!: string | null;

  @Column({
    name: 'tracking_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  trackingNumber!: string | null;

  @Column({
    name: 'carrier_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  carrierName!: string | null;

  @Column({
    name: 'vehicle_number',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  vehicleNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    name: 'created_by',
    type: 'uuid',
    nullable: true,
  })
  createdBy!: string | null;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @Column({
    name: 'posted_by',
    type: 'uuid',
    nullable: true,
  })
  postedBy!: string | null;

  @Column({
    name: 'posted_at',
    type: 'timestamptz',
    nullable: true,
  })
  postedAt!: Date | null;

  @Column({
    name: 'cancelled_by',
    type: 'uuid',
    nullable: true,
  })
  cancelledBy!: string | null;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancelledAt!: Date | null;

  @OneToMany(
    () => DeliveryNoteItemEntity,
    (item) => item.deliveryNote,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: DeliveryNoteItemEntity[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
