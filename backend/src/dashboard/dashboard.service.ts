import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DashboardMonthPoint {
  month: string;
  sales: number;
  purchases: number;
  salesOrders: number;
}

export interface DashboardOverview {
  generatedAt: string;
  currency: string | null;
  kpis: {
    salesToday: number;
    salesThisMonth: number;
    salesLastMonth: number;
    salesMonthChangePercent: number | null;
    purchasesThisMonth: number;
    openSalesOrders: number;
    openPurchaseOrders: number;
    customers: number;
    suppliers: number;
    products: number;
    lowStockItems: number;
    stockValue: number;
    pendingTallySync: number;
    failedTallySync: number;
  };
  monthly: DashboardMonthPoint[];
  salesByStatus: Array<{ status: string; count: number; total: number }>;
  purchasesByStatus: Array<{ status: string; count: number; total: number }>;
  topCustomers: Array<{
    id: string;
    name: string;
    orders: number;
    total: number;
  }>;
  topItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  lowStock: Array<{
    id: string;
    name: string;
    sku: string | null;
    currentStock: number;
    minimumStock: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    orderDate: string;
    status: string;
    syncStatus: string;
    grandTotal: number;
  }>;
  manufacturing: Array<{ status: string; count: number }>;
}

type Row = Record<string, string | number | null>;

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Sales/purchase documents that count towards revenue and spend. */
const SALES_COUNTED = `('submitted','approved','confirmed','partially_delivered','delivered','fulfilled')`;
const PURCHASE_COUNTED = `('sent','partially_received','received')`;

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Retained for the legacy unauthenticated route contract. */
  getDashboard() {
    return {
      todaySales: 0,
      monthlySales: 0,
      customers: 0,
      suppliers: 0,
      products: 0,
      lowStock: 0,
      pendingOrders: 0,
      pendingPurchases: 0,
    };
  }

  async getOverview(
    companyId: string,
    monthsRequested = 6,
  ): Promise<DashboardOverview> {
    const months = Math.min(Math.max(Math.trunc(monthsRequested) || 6, 1), 24);
    const q = <T extends Row = Row>(sql: string, params: unknown[] = []) =>
      this.dataSource.query<T[]>(sql, params);

    const [
      kpiRow,
      monthlySales,
      monthlyPurchases,
      salesByStatus,
      purchasesByStatus,
      topCustomers,
      topItems,
      lowStock,
      recentOrders,
      manufacturing,
      currencyRow,
    ] = await Promise.all([
      q(
        `SELECT
          (SELECT COALESCE(SUM(grand_total),0) FROM sales_orders
            WHERE company_id=$1 AND deleted_at IS NULL AND status IN ${SALES_COUNTED}
              AND order_date = CURRENT_DATE) AS sales_today,
          (SELECT COALESCE(SUM(grand_total),0) FROM sales_orders
            WHERE company_id=$1 AND deleted_at IS NULL AND status IN ${SALES_COUNTED}
              AND date_trunc('month', order_date) = date_trunc('month', CURRENT_DATE)) AS sales_month,
          (SELECT COALESCE(SUM(grand_total),0) FROM sales_orders
            WHERE company_id=$1 AND deleted_at IS NULL AND status IN ${SALES_COUNTED}
              AND date_trunc('month', order_date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) AS sales_last_month,
          (SELECT COALESCE(SUM(grand_total),0) FROM purchase_orders
            WHERE company_id=$1 AND deleted_at IS NULL AND status IN ${PURCHASE_COUNTED}
              AND date_trunc('month', po_date) = date_trunc('month', CURRENT_DATE)) AS purchases_month,
          (SELECT COUNT(*) FROM sales_orders
            WHERE company_id=$1 AND deleted_at IS NULL
              AND status IN ('draft','submitted','approved','confirmed','partially_delivered')) AS open_so,
          (SELECT COUNT(*) FROM purchase_orders
            WHERE company_id=$1 AND deleted_at IS NULL
              AND status IN ('draft','sent','partially_received')) AS open_po,
          (SELECT COUNT(*) FROM customers WHERE company_id=$1 AND deleted_at IS NULL) AS customers,
          (SELECT COUNT(*) FROM suppliers WHERE company_id=$1 AND deleted_at IS NULL) AS suppliers,
          (SELECT COUNT(*) FROM items WHERE company_id=$1 AND deleted_at IS NULL) AS products,
          (SELECT COUNT(*) FROM items
            WHERE company_id=$1 AND deleted_at IS NULL AND is_active = true
              AND track_inventory = true AND current_stock <= minimum_stock) AS low_stock,
          (SELECT COALESCE(SUM(current_stock * COALESCE(selling_price,0)),0) FROM items
            WHERE company_id=$1 AND deleted_at IS NULL AND track_inventory = true) AS stock_value,
          (SELECT COUNT(*) FROM sales_orders
            WHERE company_id=$1 AND deleted_at IS NULL AND sync_status = 'pending') AS sync_pending,
          (SELECT COUNT(*) FROM sales_orders
            WHERE company_id=$1 AND deleted_at IS NULL AND sync_status = 'failed') AS sync_failed`,
        [companyId],
      ),
      q(
        `SELECT to_char(date_trunc('month', order_date), 'YYYY-MM') AS month,
                COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS orders
           FROM sales_orders
          WHERE company_id=$1 AND deleted_at IS NULL AND status IN ${SALES_COUNTED}
            AND order_date >= date_trunc('month', CURRENT_DATE) - ($2::int - 1) * INTERVAL '1 month'
          GROUP BY 1`,
        [companyId, months],
      ),
      q(
        `SELECT to_char(date_trunc('month', po_date), 'YYYY-MM') AS month,
                COALESCE(SUM(grand_total),0) AS total
           FROM purchase_orders
          WHERE company_id=$1 AND deleted_at IS NULL AND status IN ${PURCHASE_COUNTED}
            AND po_date >= date_trunc('month', CURRENT_DATE) - ($2::int - 1) * INTERVAL '1 month'
          GROUP BY 1`,
        [companyId, months],
      ),
      q(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(grand_total),0) AS total
           FROM sales_orders WHERE company_id=$1 AND deleted_at IS NULL
          GROUP BY status ORDER BY count DESC`,
        [companyId],
      ),
      q(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(grand_total),0) AS total
           FROM purchase_orders WHERE company_id=$1 AND deleted_at IS NULL
          GROUP BY status ORDER BY count DESC`,
        [companyId],
      ),
      q(
        `SELECT c.id, c.name, COUNT(so.id) AS orders, COALESCE(SUM(so.grand_total),0) AS total
           FROM sales_orders so JOIN customers c ON c.id = so.customer_id
          WHERE so.company_id=$1 AND so.deleted_at IS NULL AND so.status IN ${SALES_COUNTED}
          GROUP BY c.id, c.name ORDER BY total DESC LIMIT 5`,
        [companyId],
      ),
      q(
        `SELECT soi.item_id, COALESCE(MAX(soi.item_name), MAX(i.name)) AS name,
                COALESCE(SUM(soi.quantity),0) AS quantity,
                COALESCE(SUM(soi.line_total),0) AS revenue
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.sales_order_id
           LEFT JOIN items i ON i.id = soi.item_id
          WHERE so.company_id=$1 AND so.deleted_at IS NULL AND so.status IN ${SALES_COUNTED}
          GROUP BY soi.item_id ORDER BY revenue DESC LIMIT 5`,
        [companyId],
      ),
      q(
        `SELECT id, name, sku, current_stock, minimum_stock FROM items
          WHERE company_id=$1 AND deleted_at IS NULL AND is_active = true
            AND track_inventory = true AND current_stock <= minimum_stock
          ORDER BY (current_stock - minimum_stock) ASC LIMIT 8`,
        [companyId],
      ),
      q(
        `SELECT so.id, so.order_number, c.name AS customer_name, so.order_date::text AS order_date,
                so.status, so.sync_status, so.grand_total
           FROM sales_orders so JOIN customers c ON c.id = so.customer_id
          WHERE so.company_id=$1 AND so.deleted_at IS NULL
          ORDER BY so.created_at DESC LIMIT 8`,
        [companyId],
      ),
      q(
        `SELECT status, COUNT(*) AS count FROM production_orders
          WHERE company_id=$1 AND deleted_at IS NULL GROUP BY status`,
        [companyId],
      ),
      q(
        `SELECT currency FROM sales_orders
          WHERE company_id=$1 AND deleted_at IS NULL AND currency IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`,
        [companyId],
      ),
    ]);

    const k = kpiRow[0] ?? {};
    const salesThisMonth = num(k.sales_month);
    const salesLastMonth = num(k.sales_last_month);

    const sales = new Map(monthlySales.map((r) => [String(r.month), r]));
    const purchases = new Map(
      monthlyPurchases.map((r) => [String(r.month), r]),
    );
    const now = new Date();
    const monthly: DashboardMonthPoint[] = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      monthly.push({
        month: key,
        sales: num(sales.get(key)?.total),
        purchases: num(purchases.get(key)?.total),
        salesOrders: num(sales.get(key)?.orders),
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      currency: (currencyRow[0]?.currency as string | undefined) ?? null,
      kpis: {
        salesToday: num(k.sales_today),
        salesThisMonth,
        salesLastMonth,
        salesMonthChangePercent:
          salesLastMonth > 0
            ? Math.round(
                ((salesThisMonth - salesLastMonth) / salesLastMonth) * 1000,
              ) / 10
            : null,
        purchasesThisMonth: num(k.purchases_month),
        openSalesOrders: num(k.open_so),
        openPurchaseOrders: num(k.open_po),
        customers: num(k.customers),
        suppliers: num(k.suppliers),
        products: num(k.products),
        lowStockItems: num(k.low_stock),
        stockValue: num(k.stock_value),
        pendingTallySync: num(k.sync_pending),
        failedTallySync: num(k.sync_failed),
      },
      monthly,
      salesByStatus: salesByStatus.map((r) => ({
        status: String(r.status),
        count: num(r.count),
        total: num(r.total),
      })),
      purchasesByStatus: purchasesByStatus.map((r) => ({
        status: String(r.status),
        count: num(r.count),
        total: num(r.total),
      })),
      topCustomers: topCustomers.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        orders: num(r.orders),
        total: num(r.total),
      })),
      topItems: topItems.map((r) => ({
        itemId: String(r.item_id),
        name: String(r.name ?? 'Item'),
        quantity: num(r.quantity),
        revenue: num(r.revenue),
      })),
      lowStock: lowStock.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        sku: (r.sku as string | null) ?? null,
        currentStock: num(r.current_stock),
        minimumStock: num(r.minimum_stock),
      })),
      recentOrders: recentOrders.map((r) => ({
        id: String(r.id),
        orderNumber: String(r.order_number),
        customerName: String(r.customer_name),
        orderDate: String(r.order_date),
        status: String(r.status),
        syncStatus: String(r.sync_status),
        grandTotal: num(r.grand_total),
      })),
      manufacturing: manufacturing.map((r) => ({
        status: String(r.status),
        count: num(r.count),
      })),
    };
  }
}
