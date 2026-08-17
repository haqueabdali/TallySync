import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NegativeInventoryMode } from '../enums/negative-inventory-mode.enum';

@Entity('negative_inventory_policies')
@Index('IDX_negative_inventory_policy_company', ['companyId'])
@Index('IDX_negative_inventory_policy_scope', ['companyId', 'warehouseId', 'itemId'])
export class NegativeInventoryPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  warehouseId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  itemId!: string | null;

  @Column({ type: 'enum', enum: NegativeInventoryMode })
  mode!: NegativeInventoryMode;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true })
  maxNegativeQuantity!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
