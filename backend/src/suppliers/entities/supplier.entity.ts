import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('suppliers')
@Index('IDX_suppliers_company', ['companyId'])
@Index('IDX_suppliers_company_name', ['companyId', 'name'])
@Index('UQ_suppliers_company_code', ['companyId', 'supplierCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('UQ_suppliers_company_email', ['companyId', 'email'], {
  unique: true,
  where: '"email" IS NOT NULL AND "deleted_at" IS NULL',
})
@Check('"credit_limit" >= 0')
export class SupplierEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'supplier_code', type: 'varchar', length: 30 }) supplierCode!: string;
  @Column({ type: 'varchar', length: 150 }) name!: string;
  @Column({ name: 'company_name', type: 'varchar', length: 180, nullable: true }) companyName!: string | null;
  @Column({ name: 'contact_person', type: 'varchar', length: 150, nullable: true }) contactPerson!: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) mobile!: string | null;
  @Column({ name: 'tax_number', type: 'varchar', length: 80, nullable: true }) taxNumber!: string | null;
  @Column({ name: 'vat_number', type: 'varchar', length: 80, nullable: true }) vatNumber!: string | null;
  @Column({ name: 'billing_address', type: 'text', nullable: true }) billingAddress!: string | null;
  @Column({ name: 'shipping_address', type: 'text', nullable: true }) shippingAddress!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) city!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) state!: string | null;
  @Column({ name: 'postal_code', type: 'varchar', length: 30, nullable: true }) postalCode!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) country!: string | null;
  @Column({ name: 'credit_limit', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) creditLimit!: number;
  @Column({ name: 'opening_balance', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) openingBalance!: number;
  @Column({ name: 'current_balance', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) currentBalance!: number;
  @Column({ type: 'varchar', length: 3, default: 'EUR' }) currency!: string;
  @Column({ name: 'payment_terms', type: 'integer', default: 0 }) paymentTerms!: number;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
