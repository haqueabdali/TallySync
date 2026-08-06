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

import { ItemEntity } from '../../inventory/entities/item.entity';
import { BillOfMaterialStatus } from '../enums/bill-of-material-status.enum';
import { BillOfMaterialComponentEntity } from './bill-of-material-component.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};

@Entity('bills_of_material')
@Index('idx_bom_company_id', ['companyId'])
@Index('idx_bom_finished_item_id', ['finishedItemId'])
@Index('uq_bom_company_code', ['companyId', 'code'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('uq_bom_active_finished_item', ['companyId', 'finishedItemId'], {
  unique: true,
  where: '"status" = \'active\' AND "deleted_at" IS NULL',
})
@Check('chk_bom_output_quantity_positive', '"output_quantity" > 0')
@Check('chk_bom_version_positive', '"version" > 0')
export class BillOfMaterialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'finished_item_id', type: 'uuid' })
  finishedItemId!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({
    name: 'output_quantity',
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numericTransformer,
  })
  outputQuantity!: number;

  @Column({
    type: 'enum',
    enum: BillOfMaterialStatus,
    enumName: 'bill_of_material_status_enum',
    default: BillOfMaterialStatus.DRAFT,
  })
  status!: BillOfMaterialStatus;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: string | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

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

  @ManyToOne(() => ItemEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'finished_item_id' })
  finishedItem!: ItemEntity;

  @OneToMany(
    () => BillOfMaterialComponentEntity,
    (component) => component.billOfMaterial,
    { cascade: ['insert', 'update'] },
  )
  components!: BillOfMaterialComponentEntity[];
}
