import { Module } from '@nestjs/common';

import { AgedPayablesModule } from '../aged-payables/aged-payables.module';
import { AgedReceivablesModule } from '../aged-receivables/aged-receivables.module';
import { BalanceSheetModule } from '../balance-sheet/balance-sheet.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';
import { InventoryValuationModule } from '../inventory-valuation/inventory-valuation.module';
import { ProfitAndLossModule } from '../profit-and-loss/profit-and-loss.module';
import { ManagementDashboardController } from './management-dashboard.controller';
import { ManagementDashboardService } from './management-dashboard.service';

@Module({
  imports: [
    ProfitAndLossModule,
    BalanceSheetModule,
    AgedReceivablesModule,
    AgedPayablesModule,
    InventoryValuationModule,
    CashFlowModule,
  ],
  controllers: [ManagementDashboardController],
  providers: [ManagementDashboardService],
  exports: [ManagementDashboardService],
})
export class ManagementDashboardModule {}
