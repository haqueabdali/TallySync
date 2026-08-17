import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('accounting_settings')
@Index('UQ_accounting_settings_company', ['companyId'], {
  unique: true,
})
export class AccountingSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'company_id',
    type: 'uuid',
  })
  companyId!: string;

  @Column({
    name: 'accounts_receivable_account_id',
    type: 'uuid',
    nullable: true,
  })
  accountsReceivableAccountId!: string | null;

  @Column({
    name: 'accounts_payable_account_id',
    type: 'uuid',
    nullable: true,
  })
  accountsPayableAccountId!: string | null;

  @Column({
    name: 'sales_revenue_account_id',
    type: 'uuid',
    nullable: true,
  })
  salesRevenueAccountId!: string | null;

  @Column({
    name: 'sales_returns_account_id',
    type: 'uuid',
    nullable: true,
  })
  salesReturnsAccountId!: string | null;

  @Column({
    name: 'output_tax_account_id',
    type: 'uuid',
    nullable: true,
  })
  outputTaxAccountId!: string | null;

  @Column({
    name: 'input_tax_account_id',
    type: 'uuid',
    nullable: true,
  })
  inputTaxAccountId!: string | null;

  @Column({
    name: 'inventory_account_id',
    type: 'uuid',
    nullable: true,
  })
  inventoryAccountId!: string | null;

  @Column({
    name: 'cost_of_goods_sold_account_id',
    type: 'uuid',
    nullable: true,
  })
  costOfGoodsSoldAccountId!: string | null;

  @Column({
    name: 'cash_account_id',
    type: 'uuid',
    nullable: true,
  })
  cashAccountId!: string | null;

  @Column({
    name: 'bank_account_id',
    type: 'uuid',
    nullable: true,
  })
  bankAccountId!: string | null;

  @Column({
    name: 'card_clearing_account_id',
    type: 'uuid',
    nullable: true,
  })
  cardClearingAccountId!: string | null;

  @Column({
    name: 'goods_received_not_invoiced_account_id',
    type: 'uuid',
    nullable: true,
  })
  goodsReceivedNotInvoicedAccountId!: string | null;

  @Column({
    name: 'purchase_expense_account_id',
    type: 'uuid',
    nullable: true,
  })
  purchaseExpenseAccountId!: string | null;

  @Column({
    name: 'rounding_difference_account_id',
    type: 'uuid',
    nullable: true,
  })
  roundingDifferenceAccountId!: string | null;

  @Column({
    name: 'default_currency',
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
  defaultCurrency!: string;

  @Column({
    name: 'auto_post_sales_invoices',
    type: 'boolean',
    default: true,
  })
  autoPostSalesInvoices!: boolean;

  @Column({
    name: 'auto_post_customer_payments',
    type: 'boolean',
    default: true,
  })
  autoPostCustomerPayments!: boolean;

  @Column({
    name: 'auto_post_sales_returns',
    type: 'boolean',
    default: true,
  })
  autoPostSalesReturns!: boolean;

  @Column({
    name: 'auto_post_goods_receipts',
    type: 'boolean',
    default: true,
  })
  autoPostGoodsReceipts!: boolean;

  @Column({
    name: 'auto_post_purchase_invoices',
    type: 'boolean',
    default: true,
  })
  autoPostPurchaseInvoices!: boolean;

  @Column({
    name: 'auto_post_supplier_payments',
    type: 'boolean',
    default: true,
  })
  autoPostSupplierPayments!: boolean;

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
  name: 'raw_materials_inventory_account_id',
  type: 'uuid',
  nullable: true,
})
rawMaterialsInventoryAccountId!: string | null;

@Column({
  name: 'work_in_progress_account_id',
  type: 'uuid',
  nullable: true,
})
workInProgressAccountId!: string | null;

@Column({
  name: 'finished_goods_inventory_account_id',
  type: 'uuid',
  nullable: true,
})
finishedGoodsInventoryAccountId!: string | null;

@Column({
  name: 'manufacturing_variance_account_id',
  type: 'uuid',
  nullable: true,
})
manufacturingVarianceAccountId!: string | null;

@Column({
  name: 'direct_labor_account_id',
  type: 'uuid',
  nullable: true,
})
directLaborAccountId!: string | null;

@Column({
  name: 'manufacturing_overhead_account_id',
  type: 'uuid',
  nullable: true,
})
manufacturingOverheadAccountId!: string | null;

@Column({
  name: 'auto_post_material_consumption',
  type: 'boolean',
  default: true,
})
autoPostMaterialConsumption!: boolean;

@Column({
  name: 'auto_post_production_completion',
  type: 'boolean',
  default: true,
})
autoPostProductionCompletion!: boolean;

@Column({
  name: 'auto_post_production_variance',
  type: 'boolean',
  default: true,
})
autoPostProductionVariance!: boolean;

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
}
