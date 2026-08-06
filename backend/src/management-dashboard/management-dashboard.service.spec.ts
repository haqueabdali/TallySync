import type { AgedPayablesService } from '../aged-payables/aged-payables.service';
import type { AgedReceivablesService } from '../aged-receivables/aged-receivables.service';
import type { BalanceSheetService } from '../balance-sheet/balance-sheet.service';
import type { CashFlowService } from '../cash-flow/cash-flow.service';
import type { InventoryValuationService } from '../inventory-valuation/inventory-valuation.service';
import type { ProfitAndLossService } from '../profit-and-loss/profit-and-loss.service';
import { ManagementDashboardService } from './management-dashboard.service';

describe('ManagementDashboardService', () => {
  it('calculates executive KPIs from existing report services', async () => {
    const profitAndLossService = {
      getReport: jest.fn().mockResolvedValue({
        totalIncome: 1000,
        totalExpenses: 700,
        netProfit: 300,
      }),
    } as unknown as ProfitAndLossService;
    const balanceSheetService = {
      getReport: jest.fn().mockResolvedValue({
        totalAssets: 2000,
        totalLiabilities: 800,
        totalEquity: 1200,
        difference: 0,
        isBalanced: true,
      }),
    } as unknown as BalanceSheetService;
    const agedReceivablesService = {
      getReport: jest.fn().mockResolvedValue({
        totals: {
          notYetDue: 100,
          days1To30: 20,
          days31To60: 30,
          days61To90: 40,
          days91To120: 50,
          over120Days: 60,
          total: 300,
        },
      }),
    } as unknown as AgedReceivablesService;
    const agedPayablesService = {
      getReport: jest.fn().mockResolvedValue({
        totals: {
          notYetDue: 50,
          days1To30: 10,
          days31To60: 10,
          days61To90: 10,
          days91To120: 10,
          over120Days: 10,
          total: 100,
        },
      }),
    } as unknown as AgedPayablesService;
    const inventoryValuationService = {
      getValuation: jest.fn().mockResolvedValue({
        summary: {
          distinctItems: 5,
          warehouseBalances: 7,
          totalQuantity: 25,
          totalInventoryValue: 500,
        },
      }),
    } as unknown as InventoryValuationService;
    const cashFlowService = {
      getReport: jest.fn().mockResolvedValue({
        openingCashBalance: 100,
        netOperatingCashFlow: 40,
        netInvestingCashFlow: -10,
        netFinancingCashFlow: 20,
        netCashMovement: 50,
        closingCashBalance: 150,
        unmappedAccountIds: [],
      }),
    } as unknown as CashFlowService;

    const service = new ManagementDashboardService(
      profitAndLossService,
      balanceSheetService,
      agedReceivablesService,
      agedPayablesService,
      inventoryValuationService,
      cashFlowService,
    );

    const result = await service.getDashboard(
      {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        currency: 'EUR',
      },
      'company-id',
    );

    expect(result.financial.profitMarginPercent).toBe(30);
    expect(result.workingCapital.overdueReceivables).toBe(200);
    expect(result.workingCapital.netWorkingCapitalExposure).toBe(200);
    expect(result.cash.closingCashBalance).toBe(150);
    expect(result.alerts.severelyOverdueReceivables).toBe(60);
  });
});
