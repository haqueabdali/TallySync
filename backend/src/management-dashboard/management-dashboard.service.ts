import { BadRequestException, Injectable } from '@nestjs/common';

import { AgedPayablesService } from '../aged-payables/aged-payables.service';
import { AgedReceivablesService } from '../aged-receivables/aged-receivables.service';
import { BalanceSheetService } from '../balance-sheet/balance-sheet.service';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { InventoryValuationService } from '../inventory-valuation/inventory-valuation.service';
import { ProfitAndLossService } from '../profit-and-loss/profit-and-loss.service';
import { ManagementDashboardFilterDto } from './dto/management-dashboard-filter.dto';
import {
  ManagementDashboardCashDto,
  ManagementDashboardResponseDto,
} from './dto/management-dashboard-response.dto';

@Injectable()
export class ManagementDashboardService {
  constructor(
    private readonly profitAndLossService: ProfitAndLossService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly agedReceivablesService: AgedReceivablesService,
    private readonly agedPayablesService: AgedPayablesService,
    private readonly inventoryValuationService: InventoryValuationService,
    private readonly cashFlowService: CashFlowService,
  ) {}

  async getDashboard(
    filter: ManagementDashboardFilterDto,
    companyId: string,
  ): Promise<ManagementDashboardResponseDto> {
    this.validateDates(filter.dateFrom, filter.dateTo);
    const asOfDate = filter.asOfDate ?? filter.dateTo;
    const currency = filter.currency?.toUpperCase();

    const [profitAndLoss, balanceSheet, receivables, payables, inventory] =
      await Promise.all([
        this.profitAndLossService.getReport(
          {
            dateFrom: filter.dateFrom,
            dateTo: filter.dateTo,
            currency,
            includeZeroBalances: false,
          },
          companyId,
        ),
        this.balanceSheetService.getReport(
          {
            asOfDate,
            currency,
            includeZeroBalances: false,
          },
          companyId,
        ),
        this.agedReceivablesService.getReport(
          {
            asOfDate,
            currency,
            includeNotYetDue: true,
            page: 1,
            limit: 1,
          },
          companyId,
        ),
        this.agedPayablesService.getReport(
          {
            asOfDate,
            currency,
            includeNotYetDue: true,
            page: 1,
            limit: 1,
          },
          companyId,
        ),
        this.inventoryValuationService.getValuation(companyId, {
          asOfDate,
          includeZeroQuantity: false,
          page: 1,
          limit: 1,
        }),
      ]);

    const cash = await this.getCashSafely(
      filter.dateFrom,
      filter.dateTo,
      currency,
      companyId,
    );

    const receivablesOverdue = this.round(
      receivables.totals.days1To30 +
        receivables.totals.days31To60 +
        receivables.totals.days61To90 +
        receivables.totals.days91To120 +
        receivables.totals.over120Days,
    );
    const payablesOverdue = this.round(
      payables.totals.days1To30 +
        payables.totals.days31To60 +
        payables.totals.days61To90 +
        payables.totals.days91To120 +
        payables.totals.over120Days,
    );
    const profitMarginPercent =
      profitAndLoss.totalIncome === 0
        ? 0
        : this.round(
            (profitAndLoss.netProfit / profitAndLoss.totalIncome) * 100,
          );

    return {
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      asOfDate,
      currency: currency ?? null,
      financial: {
        totalIncome: profitAndLoss.totalIncome,
        totalExpenses: profitAndLoss.totalExpenses,
        netProfit: profitAndLoss.netProfit,
        profitMarginPercent,
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity,
        balanceSheetDifference: balanceSheet.difference,
        balanceSheetBalanced: balanceSheet.isBalanced,
      },
      workingCapital: {
        receivables: receivables.totals.total,
        overdueReceivables: receivablesOverdue,
        payables: payables.totals.total,
        overduePayables: payablesOverdue,
        netWorkingCapitalExposure: this.round(
          receivables.totals.total - payables.totals.total,
        ),
      },
      inventory: {
        distinctItems: inventory.summary.distinctItems,
        warehouseBalances: inventory.summary.warehouseBalances,
        totalQuantity: inventory.summary.totalQuantity,
        totalInventoryValue: inventory.summary.totalInventoryValue,
      },
      cash,
      alerts: {
        severelyOverdueReceivables: receivables.totals.over120Days,
        severelyOverduePayables: payables.totals.over120Days,
        negativeCash: cash.available && cash.closingCashBalance < 0,
        lossMakingPeriod: profitAndLoss.netProfit < 0,
        balanceSheetOutOfBalance: !balanceSheet.isBalanced,
        cashFlowMappingsIncomplete:
          !cash.available || cash.unmappedAccountIds.length > 0,
      },
    };
  }

  private async getCashSafely(
    dateFrom: string,
    dateTo: string,
    currency: string | undefined,
    companyId: string,
  ): Promise<ManagementDashboardCashDto> {
    try {
      const report = await this.cashFlowService.getReport(
        { dateFrom, dateTo, currency },
        companyId,
      );
      return {
        openingCashBalance: report.openingCashBalance,
        operatingCashFlow: report.netOperatingCashFlow,
        investingCashFlow: report.netInvestingCashFlow,
        financingCashFlow: report.netFinancingCashFlow,
        netCashMovement: report.netCashMovement,
        closingCashBalance: report.closingCashBalance,
        unmappedAccountIds: report.unmappedAccountIds,
        available: true,
        warning:
          report.unmappedAccountIds.length > 0
            ? 'Some cash-flow counterpart accounts are not classified.'
            : null,
      };
    } catch (error: unknown) {
      return {
        openingCashBalance: 0,
        operatingCashFlow: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        netCashMovement: 0,
        closingCashBalance: 0,
        unmappedAccountIds: [],
        available: false,
        warning: this.getErrorMessage(error),
      };
    }
  }

  private validateDates(dateFrom: string, dateTo: string): void {
    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be before or equal to dateTo.');
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.length > 0) {
      return error.message;
    }
    return 'Cash-flow report is unavailable.';
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
