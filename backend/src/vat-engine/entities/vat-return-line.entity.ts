import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VatDirection } from '../enums/vat-direction.enum';
import { VatReturnEntity } from './vat-return.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('vat_return_lines')
@Index('UQ_vat_return_lines_return_direction_rate', ['vatReturnId', 'direction', 'taxPercent'], { unique: true })
export class VatReturnLineEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'vat_return_id', type: 'uuid' }) vatReturnId!: string;
  @ManyToOne(() => VatReturnEntity, (vatReturn) => vatReturn.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vat_return_id' })
  vatReturn!: VatReturnEntity;
  @Column({ type: 'enum', enum: VatDirection }) direction!: VatDirection;
  @Column({ name: 'tax_percent', type: 'decimal', precision: 7, scale: 4, transformer: decimalTransformer })
  taxPercent!: number;
  @Column({ name: 'taxable_amount', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  taxableAmount!: number;
  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  taxAmount!: number;
}
