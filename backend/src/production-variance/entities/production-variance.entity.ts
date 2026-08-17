import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';
import { JournalEntryEntity } from '../../journal-entries/entities/journal-entry.entity';
import { ProductionOrderEntity } from '../../production-orders/entities/production-order.entity';
import { ProductionVarianceStatus } from '../enums/production-variance-status.enum';
import { ProductionVarianceLineEntity } from './production-variance-line.entity';
const decimalTransformer = {
  to: (
    value: number | null | undefined,
  ): number =>
    value ?? 0,

  from: (
    value: string | number | null,
  ): number =>
    value === null
      ? 0
      : Number(value),
};
const numericTransformer: ValueTransformer = { to: (value: number | null | undefined) => value, from: (value: string | number | null) => value === null ? null : Number(value) };
@Entity('production_variances')
@Index('uq_production_variances_order', ['companyId', 'productionOrderId'], { unique: true })
@Check('chk_production_variance_costs_non_negative', '"material_cost" >= 0 AND "finished_goods_cost" >= 0')
export class ProductionVarianceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'production_order_id', type: 'uuid' }) productionOrderId!: string;
  @Column({ name: 'variance_date', type: 'date' }) varianceDate!: string;
  @Column({ name: 'material_cost', type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer }) materialCost!: number;
  @Column({ name: 'finished_goods_cost', type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer }) finishedGoodsCost!: number;
  @Column({ name: 'wip_variance', type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer }) wipVariance!: number;
  @Column({ type: 'enum', enum: ProductionVarianceStatus, enumName: 'production_variance_status_enum', default: ProductionVarianceStatus.CALCULATED }) status!: ProductionVarianceStatus;
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({
  name: 'total_variance',
  type: 'decimal',
  precision: 18,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
})
totalVariance!: number;
  
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @ManyToOne(() => ProductionOrderEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'production_order_id' }) productionOrder!: ProductionOrderEntity;
  @ManyToOne(() => JournalEntryEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'journal_entry_id' }) journalEntry!: JournalEntryEntity | null;
  @OneToMany(() => ProductionVarianceLineEntity, (line) => line.productionVariance, { cascade: ['insert'] }) lines!: ProductionVarianceLineEntity[];
}
