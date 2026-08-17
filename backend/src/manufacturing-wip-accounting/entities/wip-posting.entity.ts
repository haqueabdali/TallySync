import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';
import { JournalEntryEntity } from '../../journal-entries/entities/journal-entry.entity';
import { ProductionOrderEntity } from '../../production-orders/entities/production-order.entity';
import { WipPostingType } from '../enums/wip-posting-type.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => value === null ? null : Number(value),
};

@Entity('manufacturing_wip_postings')
@Index('idx_manufacturing_wip_postings_company', ['companyId'])
@Index('idx_manufacturing_wip_postings_order', ['productionOrderId'])
@Index('uq_manufacturing_wip_postings_source', ['companyId', 'postingType', 'sourceId'], { unique: true })
export class WipPostingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string;

  @Column({ name: 'posting_type', type: 'enum', enum: WipPostingType, enumName: 'manufacturing_wip_posting_type_enum' })
  postingType!: WipPostingType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'posting_date', type: 'date' })
  postingDate!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'journal_entry_id', type: 'uuid' })
  journalEntryId!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ProductionOrderEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'production_order_id' })
  productionOrder!: ProductionOrderEntity;

  @ManyToOne(() => JournalEntryEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry!: JournalEntryEntity;
}
