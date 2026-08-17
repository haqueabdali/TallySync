import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountingEngineModule } from './accounting-engine/accounting-engine.module';
import { AccountingSettingsModule } from './accounting-settings/accounting-settings.module';
import { AccountsModule } from './accounts/accounts.module';
import { AdvancedReportingModule } from './advanced-reporting/advanced-reporting.module';
import { AgedPayablesModule } from './aged-payables/aged-payables.module';
import { AgedReceivablesModule } from './aged-receivables/aged-receivables.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetDisposalModule } from './asset-disposal/asset-disposal.module';
import { AssetManagementModule } from './asset-management/asset-management.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { BackgroundJobsModule } from './background-jobs/background-jobs.module';
import { BalanceSheetModule } from './balance-sheet/balance-sheet.module';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { BillOfMaterialsModule } from './bill-of-materials/bill-of-materials.module';
import { CapacityPlanningModule } from './capacity-planning/capacity-planning.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { CategoriesModule } from './categories/categories.module';
import { CostingVarianceModule } from './costing-variance/costing-variance.module';
import { CustomerPaymentsModule } from './customer-payments/customer-payments.module';
import { CustomerStatementsModule } from './customer-statements/customer-statements.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { createDatabaseOptions } from './database/config/database-options';
import { DeliveryNotesModule } from './delivery-notes/delivery-notes.module';
import { DepreciationModule } from './depreciation/depreciation.module';
import { FinishedGoodsModule } from './finished-goods/finished-goods.module';
import { GeneralLedgerModule } from './general-ledger/general-ledger.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { HealthModule } from './health/health.module';
import { InventoryAgingModule } from './inventory-aging/inventory-aging.module';
import { InventoryCostEngineModule } from './inventory-cost-engine/inventory-cost-engine.module';
import { MovingAverageCostingModule } from './inventory-cost-engine/moving-average/moving-average-costing.module';
import { InventoryRevaluationModule } from './inventory-revaluation/inventory-revaluation.module';
import { InventoryValuationModule } from './inventory-valuation/inventory-valuation.module';
import { InventoryModule } from './inventory/inventory.module';
import { ItemsModule } from './items/items.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { LandedCostsModule } from './landed-costs/landed-costs.module';
import { MaintenanceManagementModule } from './maintenance-management/maintenance-management.module';
import { ManagementDashboardModule } from './management-dashboard/management-dashboard.module';
import { ManufacturingMrpModule } from './manufacturing-mrp/manufacturing-mrp.module';
import { ManufacturingWipAccountingModule } from './manufacturing-wip-accounting/manufacturing-wip-accounting.module';
import { ManualCostAdjustmentsModule } from './manual-cost-adjustments/manual-cost-adjustments.module';
import { MaterialConsumptionModule } from './material-consumption/material-consumption.module';
import { MobileModule } from './mobile/mobile.module';
import { NegativeInventoryPolicyModule } from './negative-inventory-policy/negative-inventory-policy.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { ProductionSchedulingModule } from './production-scheduling/production-scheduling.module';
import { ProductionVarianceModule } from './production-variance/production-variance.module';
import { ProfitAndLossModule } from './profit-and-loss/profit-and-loss.module';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseReturnsModule } from './purchase-returns/purchase-returns.module';
import { QualityManagementModule } from './quality-management/quality-management.module';
import { SalesInvoicesModule } from './sales-invoices/sales-invoices.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { SalesQuotationsModule } from './sales-quotations/sales-quotations.module';
import { SalesReturnsModule } from './sales-returns/sales-returns.module';
import { StockLedgerModule } from './stock-ledger/stock-ledger.module';
import { SupplierPaymentsModule } from './supplier-payments/supplier-payments.module';
import { SupplierStatementsModule } from './supplier-statements/supplier-statements.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TallySyncModule } from './tally-sync/tally-sync.module';
import { TrialBalanceModule } from './trial-balance/trial-balance.module';
import { UsersModule } from './users/users.module';
import { VatEngineModule } from './vat-engine/vat-engine.module';
import { VatSettlementModule } from './vat-settlement/vat-settlement.module';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ) => createDatabaseOptions(configService),
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 20,
        },
      ],
    }),

    AuthModule,
    UsersModule,
    InventoryModule,
    SalesOrdersModule,
    TallySyncModule,
    MobileModule,
    SuppliersModule,
    HealthModule,
    DashboardModule,
    CategoriesModule,
    WarehousesModule,
    ItemsModule,
    CustomersModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    SupplierPaymentsModule,
    PurchaseReturnsModule,
    SalesQuotationsModule,
    DeliveryNotesModule,
    SalesInvoicesModule,
    CustomerPaymentsModule,
    SalesReturnsModule,
    AccountsModule,
    JournalEntriesModule,
    GeneralLedgerModule,
    AccountingSettingsModule,
    AccountingEngineModule,
    PurchaseInvoicesModule,
    LandedCostsModule,
    InventoryCostEngineModule,
    MovingAverageCostingModule,
    StockLedgerModule,
    InventoryValuationModule,
    InventoryAgingModule,
    ManufacturingMrpModule,
    BillOfMaterialsModule,
    ProductionOrdersModule,
    MaterialConsumptionModule,
    FinishedGoodsModule,
    AssetManagementModule,
    DepreciationModule,
    BankReconciliationModule,
    VatEngineModule,
    CashFlowModule,
    ProfitAndLossModule,
    BalanceSheetModule,
    AgedReceivablesModule,
    ManagementDashboardModule,
    AgedPayablesModule,
    TrialBalanceModule,
    CustomerStatementsModule,
    SupplierStatementsModule,
    InventoryRevaluationModule,
    ManualCostAdjustmentsModule,
    NegativeInventoryPolicyModule,
    ManufacturingWipAccountingModule,
    ProductionVarianceModule,
    AssetDisposalModule,
    VatSettlementModule,
    BackgroundJobsModule,
    NotificationsModule,
    AuditLogsModule,
    ProductionSchedulingModule,
    CapacityPlanningModule,
    QualityManagementModule,
    MaintenanceManagementModule,
    AdvancedReportingModule,
    CostingVarianceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
