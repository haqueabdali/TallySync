import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AccountEntity } from '../../accounts/entities/account.entity';
import { JournalEntryEntity } from './journal-entry.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('journal_entry_lines')
@Index('IDX_journal_entry_lines_entry', ['journalEntryId'])
@Index('IDX_journal_entry_lines_account', ['accountId'])
@Index('IDX_journal_entry_lines_party', ['partyType', 'partyId'])
export class JournalEntryLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'journal_entry_id',
    type: 'uuid',
  })
  journalEntryId!: string;

  @ManyToOne(
    () => JournalEntryEntity,
    (entry) => entry.lines,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry!: JournalEntryEntity;

  @Column({
    name: 'account_id',
    type: 'uuid',
  })
  accountId!: string;

  @ManyToOne(() => AccountEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  debit!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  credit!: number;

  @Column({
    name: 'party_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  partyType!: string | null;

  @Column({
    name: 'party_id',
    type: 'uuid',
    nullable: true,
  })
  partyId!: string | null;

  @Column({
    name: 'cost_center',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  costCenter!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;
}
