import type { DataSource } from 'typeorm';

import { DashboardService } from './dashboard.service';

describe('DashboardService.getOverview', () => {
  const build = () => {
    const query = jest.fn((sql: string): Promise<unknown[]> => {
      if (sql.includes('AS sales_today')) {
        return Promise.resolve([
          {
            sales_today: '10',
            sales_month: '150',
            sales_last_month: '100',
            purchases_month: '40',
            open_so: '3',
            open_po: '2',
            customers: '5',
            suppliers: '4',
            products: '9',
            low_stock: '1',
            stock_value: '1234.5',
            sync_pending: '2',
            sync_failed: '1',
          },
        ]);
      }
      return Promise.resolve([]);
    });
    const service = new DashboardService({ query } as unknown as DataSource);
    return { service, query };
  };

  it('scopes every query to the company and computes KPIs', async () => {
    const { service, query } = build();
    const overview = await service.getOverview('company-1', 6);

    expect(query).toHaveBeenCalled();
    for (const call of query.mock.calls as Array<[string, unknown[]]>) {
      expect(call[1][0]).toBe('company-1');
      expect(call[0]).toContain('company_id=$1');
    }
    expect(overview.kpis.salesThisMonth).toBe(150);
    expect(overview.kpis.salesMonthChangePercent).toBe(50);
    expect(overview.kpis.stockValue).toBe(1234.5);
    expect(overview.kpis.failedTallySync).toBe(1);
  });

  it('zero-fills the monthly series and clamps the range', async () => {
    const { service } = build();
    expect((await service.getOverview('c', 6)).monthly).toHaveLength(6);
    expect((await service.getOverview('c', 999)).monthly).toHaveLength(24);
    expect((await service.getOverview('c', 0)).monthly).toHaveLength(6);
    const first = (await service.getOverview('c', 3)).monthly[0];
    expect(first).toMatchObject({ sales: 0, purchases: 0, salesOrders: 0 });
  });

  it('reports a null change percent when last month had no sales', async () => {
    const query = jest.fn(() =>
      Promise.resolve([{ sales_month: '5', sales_last_month: '0' }]),
    );
    const service = new DashboardService({ query } as unknown as DataSource);
    expect(
      (await service.getOverview('c')).kpis.salesMonthChangePercent,
    ).toBeNull();
  });
});
