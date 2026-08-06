import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VatReturnStatus } from '../enums/vat-return-status.enum';
import { VatReturnLineEntity } from './vat-return-line.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('vat_returns')
@Index('UQ_vat_returns_company_period', ['companyId', 'periodStart', 'periodEnd'], {
  unique: true,
})
export class VatReturnEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'period_start', type: 'date' }) periodStart!: string;
  @Column({ name: 'period_end', type: 'date' }) periodEnd!: string;
  @Column({ type: 'enum', enum: VatReturnStatus, default: VatReturnStatus.DRAFT })
  status!: VatReturnStatus;
  @Column({ name: 'output_tax', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  outputTax!: number;
  @Column({ name: 'input_tax', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  inputTax!: number;
  @Column({ name: 'net_tax_payable', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  netTaxPayable!: number;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'finalized_by', type: 'uuid', nullable: true }) finalizedBy!: string | null;
  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true }) finalizedAt!: Date | null;
  @OneToMany(() => VatReturnLineEntity, (line) => line.vatReturn, { cascade: true })
  lines!: VatReturnLineEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
