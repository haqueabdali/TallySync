import 'dotenv/config';
import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { RoleEntity } from '../auth/entities/role.entity';
import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { AuditLogEntity } from '../users/entities/audit-log.entity';

import { CategoryEntity } from '../inventory/entities/category.entity';
import { ItemEntity } from '../inventory/entities/item.entity';

import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';

import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';

import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../purchase-orders/entities/purchase-order-item.entity';

import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';

import { DeliveryNoteEntity } from '../delivery-notes/entities/delivery-note.entity';
import { DeliveryNoteItemEntity } from '../delivery-notes/entities/delivery-note-item.entity';

import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceItemEntity } from '../sales-invoices/entities/sales-invoice-item.entity';

import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { CustomerPaymentAllocationEntity } from '../customer-payments/entities/customer-payment-allocation.entity';

import { SalesReturnEntity } from '../sales-returns/entities/sales-return.entity';
import { SalesReturnItemEntity } from '../sales-returns/entities/sales-return-item.entity';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceItemEntity } from '../purchase-invoices/entities/purchase-invoice-item.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { SupplierPaymentAllocation } from '../supplier-payments/entities/supplier-payment-allocation.entity';

import { LandedCostEntity } from '../landed-costs/entities/landed-cost.entity';
import { LandedCostChargeEntity } from '../landed-costs/entities/landed-cost-charge.entity';
import { LandedCostItemAllocationEntity } from '../landed-costs/entities/landed-cost-item-allocation.entity';

import { BillOfMaterialEntity } from '../bill-of-materials/entities/bill-of-material.entity';
import { BillOfMaterialComponentEntity } from '../bill-of-materials/entities/bill-of-material-component.entity';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { ProductionOrderComponentEntity } from '../production-orders/entities/production-order-component.entity';
import { MaterialConsumptionEntity } from '../material-consumption/entities/material-consumption.entity';
import { MaterialConsumptionLineEntity } from '../material-consumption/entities/material-consumption-line.entity';
import { FinishedGoodsReceiptEntity } from '../finished-goods/entities/finished-goods-receipt.entity';
import { AssetCategoryEntity } from '../asset-management/entities/asset-category.entity';
import { FixedAssetEntity } from '../asset-management/entities/fixed-asset.entity';
import { DepreciationRunEntity } from '../depreciation/entities/depreciation-run.entity';
import { DepreciationEntryEntity } from '../depreciation/entities/depreciation-entry.entity';
import { BankReconciliationEntity } from '../bank-reconciliation/entities/bank-reconciliation.entity';
import { BankStatementLineEntity } from '../bank-reconciliation/entities/bank-statement-line.entity';
import { BankReconciliationMatchEntity } from '../bank-reconciliation/entities/bank-reconciliation-match.entity';
import { VatReturnEntity } from '../vat-engine/entities/vat-return.entity';
import { VatReturnLineEntity } from '../vat-engine/entities/vat-return-line.entity';
import { CashFlowAccountMappingEntity } from '../cash-flow/entities/cash-flow-account-mapping.entity';
import { InventoryRevaluationEntity } from '../inventory-revaluation/entities/inventory-revaluation.entity';
import { InventoryRevaluationLineEntity } from '../inventory-revaluation/entities/inventory-revaluation-line.entity';
import { ManualCostAdjustmentEntity } from '../manual-cost-adjustments/entities/manual-cost-adjustment.entity';
import { ManualCostAdjustmentLineEntity } from '../manual-cost-adjustments/entities/manual-cost-adjustment-line.entity';
import { NegativeInventoryPolicyEntity } from '../negative-inventory-policy/entities/negative-inventory-policy.entity';
import { WipAccountingSettingsEntity } from '../manufacturing-wip-accounting/entities/wip-accounting-settings.entity';
import { WipPostingEntity } from '../manufacturing-wip-accounting/entities/wip-posting.entity';
import { ProductionVarianceSettingsEntity } from '../production-variance/entities/production-variance-settings.entity';
import { ProductionVarianceEntity } from '../production-variance/entities/production-variance.entity';
import { ProductionVarianceLineEntity } from '../production-variance/entities/production-variance-line.entity';
import { AssetDisposalEntity } from '../asset-disposal/entities/asset-disposal.entity';
import { VatSettlementSettingsEntity } from '../vat-settlement/entities/vat-settlement-settings.entity';
import { VatSettlementEntity } from '../vat-settlement/entities/vat-settlement.entity';
import { BackgroundJobEntity } from '../background-jobs/entities/background-job.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationTemplateEntity } from '../notifications/entities/notification-template.entity';
import { NotificationPreferenceEntity } from '../notifications/entities/notification-preference.entity';
import { WorkCenterEntity } from '../capacity-planning/entities/work-center.entity';
import { WorkCenterCapacityOverrideEntity } from '../capacity-planning/entities/work-center-capacity-override.entity';
import { QualityInspectionEntity } from '../quality-management/entities/quality-inspection.entity';
import { QualityInspectionCheckEntity } from '../quality-management/entities/quality-inspection-check.entity';
import { MaintenanceAssetEntity } from '../maintenance-management/entities/maintenance-asset.entity';
import { MaintenancePlanEntity } from '../maintenance-management/entities/maintenance-plan.entity';
import { MaintenanceWorkOrderEntity } from '../maintenance-management/entities/maintenance-work-order.entity';
import { MaintenanceDowntimeEntity } from '../maintenance-management/entities/maintenance-downtime.entity';
import { ProductionCostAnalysisEntity } from '../costing-variance/entities/production-cost-analysis.entity';
import { ProductionCostMaterialLineEntity } from '../costing-variance/entities/production-cost-material-line.entity';
import { LicenseEntity } from '../licensing/entities/license.entity';
import { LicenseFeatureEntity } from '../licensing/entities/license-feature.entity';
import { LicenseActivationEntity } from '../licensing/entities/license-activation.entity';
import { LicenseAuditLogEntity } from '../licensing/entities/license-audit-log.entity';
import { LicenseSessionEntity } from '../licensing/entities/license-session.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ?? 'tallysync_db',
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',

  entities: [
    RoleEntity,
    CompanyEntity,
    UserEntity,
    RefreshTokenEntity,
    AuditLogEntity,

    CategoryEntity,
    ItemEntity,

    CustomerEntity,
    SupplierEntity,
    WarehouseEntity,

    PurchaseOrderEntity,
    PurchaseOrderItemEntity,
    GoodsReceipt,
    GoodsReceiptItem,

    SalesOrderEntity,
    SalesOrderItemEntity,
    DeliveryNoteEntity,
    DeliveryNoteItemEntity,
    SalesInvoiceEntity,
    SalesInvoiceItemEntity,
    CustomerPaymentEntity,
    CustomerPaymentAllocationEntity,
    SalesReturnEntity,
    SalesReturnItemEntity,

    AccountEntity,
    JournalEntryEntity,
    JournalEntryLineEntity,
    AccountingSettingsEntity,

    PurchaseInvoiceEntity,
    PurchaseInvoiceItemEntity,
    SupplierPayment,
    SupplierPaymentAllocation,
    LandedCostEntity,
    LandedCostChargeEntity,
    LandedCostItemAllocationEntity,
    BillOfMaterialEntity,
    BillOfMaterialComponentEntity,
    ProductionOrderEntity,
    ProductionOrderComponentEntity,
    MaterialConsumptionEntity,
    MaterialConsumptionLineEntity,
    FinishedGoodsReceiptEntity,
    AssetCategoryEntity,
    FixedAssetEntity,
    DepreciationRunEntity,
    DepreciationEntryEntity,
    BankReconciliationEntity,
    BankStatementLineEntity,
    BankReconciliationMatchEntity,
    VatReturnEntity,
    VatReturnLineEntity,
    CashFlowAccountMappingEntity,
    InventoryRevaluationEntity,
    InventoryRevaluationLineEntity,
    ManualCostAdjustmentEntity,
    ManualCostAdjustmentLineEntity,
    NegativeInventoryPolicyEntity,
    WipAccountingSettingsEntity,
    WipPostingEntity,
    ProductionVarianceSettingsEntity,
    ProductionVarianceEntity,
    ProductionVarianceLineEntity,
    AssetDisposalEntity,
    VatSettlementSettingsEntity,
    VatSettlementEntity,
    BackgroundJobEntity,
    NotificationEntity,
    NotificationTemplateEntity,
    NotificationPreferenceEntity,
    WorkCenterEntity,
    WorkCenterCapacityOverrideEntity,
    QualityInspectionEntity,
    QualityInspectionCheckEntity,
    MaintenanceAssetEntity,
    MaintenancePlanEntity,
    MaintenanceWorkOrderEntity,
    MaintenanceDowntimeEntity,
    ProductionCostAnalysisEntity,
    ProductionCostMaterialLineEntity,
    LicenseEntity,
    LicenseFeatureEntity,
    LicenseActivationEntity,
    LicenseAuditLogEntity,
    LicenseSessionEntity,
  ],

  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  migrationsTableName: 'typeorm_migrations',
});
