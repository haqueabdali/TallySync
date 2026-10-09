import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tally_accounting_syncs')
@Index('IDX_tally_accounting_syncs_company', ['companyId'])
@Index('IDX_tally_accounting_syncs_status', ['companyId', 'status'])
@Index(
  'UQ_tally_accounting_syncs_source',
  ['companyId', 'sourceType', 'sourceId'],
  { unique: true },
)
export class TallyAccountingSyncEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 40 })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'voucher_type', type: 'varchar', length: 40 })
  voucherType!: string;

  @Column({ name: 'voucher_number', type: 'varchar', length: 80 })
  voucherNumber!: string;

  @Column({ name: 'tally_voucher_id', type: 'varchar', length: 120, nullable: true })
  tallyVoucherId!: string | null;

  @Column({ name: 'tally_guid', type: 'varchar', length: 120, nullable: true })
  tallyGuid!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'syncing' | 'synced' | 'failed';

  @Column({ name: 'sync_attempts', type: 'integer', default: 0 })
  syncAttempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
