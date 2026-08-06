import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { JournalEntrySourceType } from '../enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from '../enums/journal-entry-status.enum';
import { JournalEntryLineEntity } from './journal-entry-line.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('journal_entries')
@Index('IDX_journal_entries_company', ['companyId'])
@Index('IDX_journal_entries_entry_date', ['companyId', 'entryDate'])
@Index('IDX_journal_entries_status', ['companyId', 'status'])
@Index('IDX_journal_entries_source', ['companyId', 'sourceType', 'sourceId'])
@Index(
  'UQ_journal_entries_company_number',
  ['companyId', 'entryNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class JournalEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    name: 'entry_number',
    type: 'varchar',
    length: 50,
  })
  entryNumber!: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: string;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status!: JournalEntryStatus;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: JournalEntrySourceType,
    default: JournalEntrySourceType.MANUAL,
  })
  sourceType!: JournalEntrySourceType;

  @Column({
    name: 'source_id',
    type: 'uuid',
    nullable: true,
  })
  sourceId!: string | null;

  @Column({
    name: 'reference_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  referenceNumber!: string | null;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
  currency!: string;

  @Column({
    name: 'total_debit',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalDebit!: number;

  @Column({
    name: 'total_credit',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalCredit!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  narration!: string | null;

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
    name: 'reversed_by',
    type: 'uuid',
    nullable: true,
  })
  reversedBy!: string | null;

  @Column({
    name: 'reversed_at',
    type: 'timestamptz',
    nullable: true,
  })
  reversedAt!: Date | null;

  @Column({
    name: 'reversal_reason',
    type: 'text',
    nullable: true,
  })
  reversalReason!: string | null;

  @Column({
    name: 'reversal_entry_id',
    type: 'uuid',
    nullable: true,
  })
  reversalEntryId!: string | null;

  @OneToMany(
    () => JournalEntryLineEntity,
    (line) => line.journalEntry,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  lines!: JournalEntryLineEntity[];

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
