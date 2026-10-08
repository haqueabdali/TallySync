/* Company workspace: the business-facing admin panel (dashboard, orders,
 * customers, products, purchasing, Tally sync). The backend remains the
 * authority on tenant scoping and licensing; this module only presents data. */
import {
  barLineChart,
  donutChart,
  esc,
  fmtCompact,
  fmtMoney,
  fmtNumber,
  monthLabel,
  rankBars,
  sparkline,
  stockGauge,
} from './charts.js';

export const WORKSPACE_ROUTES = ['dashboard', 'orders', 'customers', 'products', 'purchasing', 'tally'];

const NAV = [
  ['dashboard', '◫', 'Dashboard'],
  ['orders', '▤', 'Sales orders'],
  ['customers', '♙', 'Customers'],
  ['products', '▦', 'Products & stock'],
  ['purchasing', '⇩', 'Purchasing'],
  ['tally', '⟳', 'Tally sync'],
];

const view = {
  months: 6,
  orders: { page: 1, search: '', syncStatus: '' },
  customers: { search: '' },
  products: { search: '', lowOnly: false },
  purchasing: { tab: 'orders', page: 1, search: '' },
};

let ctx = null;
let searchTimer = null;

const label = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const pill = (value) => `<span class="badge st-${esc(String(value || 'unknown').toLowerCase())}">${esc(label(value || 'unknown'))}</span>`;

const stateBlock = (title, text) => `<div class="card card-pad ws-state"><h2>${esc(title)}</h2><p class="brand-sub">${esc(text)}</p></div>`;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function shell(content, route, title) {
  const user = ctx.state.session?.user;
  const nav = NAV.map(
    ([name, icon, text]) =>
      `<button class="nav-button ${route === name ? 'active' : ''}" data-nav="#/${name}" ${route === name ? 'aria-current="page"' : ''}><span class="nav-icon">${icon}</span>${esc(text)}</button>`,
  ).join('');
  return `
  <aside class="sidebar">
    <div class="brand-row"><div class="brand-mark">TS</div><div><div class="brand-title">${esc(ctx.appName)}</div><div class="brand-sub">Business workspace</div></div></div>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <div class="sidebar-footer">
      <div class="user-mini"><strong>${esc(user?.fullName || 'Administrator')}</strong><span>${esc(user?.email || '')}</span></div>
      <div class="foot-actions">
        <button class="btn secondary" data-action="toggle-theme" aria-label="Toggle light or dark theme">◐ Theme</button>
        <button class="btn secondary" data-action="logout">Sign out</button>
      </div>
    </div>
  </aside>
  <main class="main">
    <header class="topbar"><div class="topbar-title">${esc(title)}</div><span class="badge active">Company admin</span></header>
    <div class="content" id="ws-content">${content}</div>
  </main>`;
}

function mount(route, title, content) {
  const app = document.getElementById('app');
  app.className = 'app-shell authenticated';
  app.innerHTML = shell(content, route, title);
}

const loadingBlock = () => `<div class="loading"><div><div class="spinner"></div>Loading…</div></div>`;

function failure(error) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  const licensed = /licen[cs]e/i.test(message);
  return stateBlock(
    licensed ? 'This module is not available for your licence' : 'Unable to load this page',
    licensed ? `${message}. Ask your platform administrator to enable it.` : message,
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

function kpiCard({ labelText, value, foot, trend, spark, tone = '' }) {
  return `<article class="card kpi ${tone}">
    <div class="kpi-top"><span class="stat-label">${esc(labelText)}</span>${trend ?? ''}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-bottom"><span class="stat-foot">${esc(foot)}</span>${spark ?? ''}</div>
  </article>`;
}

function trendChip(percent) {
  if (percent === null || percent === undefined) return '<span class="chip flat">new</span>';
  const up = percent >= 0;
  return `<span class="chip ${up ? 'up' : 'down'}" title="Compared with last month">${up ? '▲' : '▼'} ${esc(fmtNumber(Math.abs(percent), 1))}%</span>`;
}

function dashboardHtml(d) {
  const k = d.kpis;
  const cur = d.currency;
  const money = (v) => fmtMoney(v, cur);
  const series = d.monthly.map((m) => m.sales);
  const alerts = [];
  if (k.failedTallySync > 0) alerts.push(`<a href="#/tally" class="alert danger">⚠ ${esc(k.failedTallySync)} order(s) failed to sync to Tally — review</a>`);
  if (k.lowStockItems > 0) alerts.push(`<a href="#/products" class="alert warn">▲ ${esc(k.lowStockItems)} item(s) at or below minimum stock</a>`);
  const topCustomers = rankBars(
    d.topCustomers.map((c) => ({ label: c.name, value: c.total, sub: `${c.orders} order${c.orders === 1 ? '' : 's'}` })),
    { format: money },
  );
  const topItems = rankBars(
    d.topItems.map((i) => ({ label: i.name, value: i.revenue, sub: `${fmtNumber(i.quantity)} sold` })),
    { format: money },
  );
  const lowStock = d.lowStock.length
    ? `<ul class="low-list">${d.lowStock
        .map(
          (i) => `<li><div><b>${esc(i.name)}</b><small>${esc(i.sku || '—')}</small></div><div class="low-right"><span>${esc(fmtNumber(i.currentStock))} / ${esc(fmtNumber(i.minimumStock))}</span>${stockGauge(i.currentStock, i.minimumStock)}</div></li>`,
        )
        .join('')}</ul>`
    : '<div class="chart-empty">All tracked items are above their minimum stock.</div>';
  const recent = d.recentOrders.length
    ? `<div class="table-wrap"><table class="compact"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Tally</th><th class="num">Total</th></tr></thead><tbody>${d.recentOrders
        .map(
          (o) => `<tr><td class="cell-title">${esc(o.orderNumber)}</td><td>${esc(o.customerName)}</td><td>${esc(o.orderDate)}</td><td>${pill(o.status)}</td><td>${pill(o.syncStatus)}</td><td class="num">${esc(money(o.grandTotal))}</td></tr>`,
        )
        .join('')}</tbody></table></div>`
    : '<div class="chart-empty">No sales orders yet.</div>';
  const mfg = d.manufacturing.length
    ? donutChart(d.manufacturing.map((m) => ({ label: m.status, value: m.count })), { centreLabel: 'Production', labelFor: label })
    : '<div class="chart-empty">No production orders.</div>';
  const monthsOptions = [3, 6, 12]
    .map((m) => `<option value="${m}" ${m === view.months ? 'selected' : ''}>Last ${m} months</option>`)
    .join('');

  return `
    <div class="page-head">
      <div><h1>${esc(greeting())}, ${esc((ctx.state.session?.user?.fullName || 'there').split(' ')[0])}</h1>
      <p>Here is how the business is performing. Updated ${esc(new Date(d.generatedAt).toLocaleTimeString())}.</p></div>
      <div class="actions">
        <select class="select" id="ws-months" aria-label="Period">${monthsOptions}</select>
        <button class="btn secondary" data-ws="refresh">↻ Refresh</button>
      </div>
    </div>
    ${alerts.length ? `<div class="alerts">${alerts.join('')}</div>` : ''}
    <section class="kpi-grid" aria-label="Key figures">
      ${kpiCard({ labelText: 'Sales this month', value: esc(money(k.salesThisMonth)), foot: `Last month ${money(k.salesLastMonth)}`, trend: trendChip(k.salesMonthChangePercent), spark: sparkline(series), tone: 'hero' })}
      ${kpiCard({ labelText: 'Sales today', value: esc(money(k.salesToday)), foot: new Date().toLocaleDateString() })}
      ${kpiCard({ labelText: 'Purchases this month', value: esc(money(k.purchasesThisMonth)), foot: `${fmtNumber(k.openPurchaseOrders)} open PO` })}
      ${kpiCard({ labelText: 'Open sales orders', value: esc(fmtNumber(k.openSalesOrders)), foot: 'Awaiting delivery or approval' })}
      ${kpiCard({ labelText: 'Stock value', value: esc(money(k.stockValue)), foot: `${fmtNumber(k.products)} products` })}
      ${kpiCard({ labelText: 'Tally sync queue', value: esc(fmtNumber(k.pendingTallySync + k.failedTallySync)), foot: `${fmtNumber(k.failedTallySync)} failed · ${fmtNumber(k.pendingTallySync)} pending`, tone: k.failedTallySync ? 'danger' : '' })}
    </section>
    <section class="grid dash-row-1">
      <div class="card"><div class="section-head"><h2 class="section-title">Sales vs purchases</h2><span class="muted-sm">${esc(fmtCompact(series.reduce((a, b) => a + b, 0)))} total sales</span></div><div class="card-pad">${barLineChart(d.monthly, { currency: cur })}</div></div>
      <div class="card"><div class="section-head"><h2 class="section-title">Sales order status</h2></div><div class="card-pad">${donutChart(d.salesByStatus.map((s) => ({ label: s.status, value: s.count })), { centreLabel: 'Orders', labelFor: label })}</div></div>
    </section>
    <section class="grid dash-row-2">
      <div class="card"><div class="section-head"><h2 class="section-title">Top customers</h2></div><div class="card-pad">${topCustomers}</div></div>
      <div class="card"><div class="section-head"><h2 class="section-title">Best-selling products</h2></div><div class="card-pad">${topItems}</div></div>
      <div class="card"><div class="section-head"><h2 class="section-title">Low stock</h2><a class="muted-link" href="#/products">View all</a></div><div class="card-pad">${lowStock}</div></div>
    </section>
    <section class="grid dash-row-3">
      <div class="card"><div class="section-head"><h2 class="section-title">Recent sales orders</h2><a class="muted-link" href="#/orders">View all</a></div>${recent}</div>
      <div class="card"><div class="section-head"><h2 class="section-title">Production</h2></div><div class="card-pad">${mfg}</div></div>
    </section>`;
}

async function renderDashboard() {
  mount('dashboard', 'Dashboard', loadingBlock());
  try {
    const data = await ctx.api(`/dashboard/overview?months=${view.months}`);
    document.getElementById('ws-content').innerHTML = dashboardHtml(data);
  } catch (error) {
    document.getElementById('ws-content').innerHTML = failure(error);
  }
}

/* ───────────────────────── List pages ───────────────────────── */

function listShell({ title, subtitle, toolbar, actions = '' }) {
  return `
    <div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="actions">${actions}</div></div>
    <div class="toolbar">${toolbar}</div>
    <div class="card" id="ws-list">${loadingBlock()}</div>`;
}

const searchBox = (id, value, placeholder) =>
  `<input class="input" id="${id}" type="search" value="${esc(value)}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}">`;

function emptyRow(text) {
  return `<div class="empty">${esc(text)}</div>`;
}

function pager(meta, key) {
  if (!meta || meta.totalPages <= 1) return meta ? `<div class="pager"><span>${esc(fmtNumber(meta.total))} record(s)</span></div>` : '';
  return `<div class="pager"><span>${esc(fmtNumber(meta.total))} record(s) · page ${esc(meta.page)} of ${esc(meta.totalPages)}</span>
    <span><button class="btn small secondary" data-ws="page" data-key="${esc(key)}" data-dir="-1" ${meta.page <= 1 ? 'disabled' : ''}>← Prev</button>
    <button class="btn small secondary" data-ws="page" data-key="${esc(key)}" data-dir="1" ${meta.page >= meta.totalPages ? 'disabled' : ''}>Next →</button></span></div>`;
}

async function fillList(loader) {
  const target = document.getElementById('ws-list');
  if (!target) return;
  try {
    target.innerHTML = await loader();
  } catch (error) {
    target.innerHTML = failure(error);
  }
}

async function renderOrders() {
  mount(
    'orders',
    'Sales orders',
    listShell({
      title: 'Sales orders',
      subtitle: 'Every order captured from the mobile app and the back office.',
      toolbar: `${searchBox('ws-search', view.orders.search, 'Search order number or customer')}
        <select class="select" id="ws-sync" aria-label="Tally sync status"><option value="">All sync states</option>${['pending', 'syncing', 'synced', 'failed']
          .map((s) => `<option value="${s}" ${view.orders.syncStatus === s ? 'selected' : ''}>${label(s)}</option>`)
          .join('')}</select>`,
      actions: '<button class="btn primary" data-ws="sync-pending">⟳ Sync pending to Tally</button>',
    }),
  );
  await loadOrders();
}

async function loadOrders() {
  await fillList(async () => {
    const q = new URLSearchParams({ page: String(view.orders.page), limit: '20' });
    if (view.orders.search) q.set('search', view.orders.search);
    if (view.orders.syncStatus) q.set('syncStatus', view.orders.syncStatus);
    const res = await ctx.api(`/mobile/sales-orders?${q}`);
    const { orders, pagination } = res.data;
    if (!orders.length) return emptyRow('No sales orders match your filters.');
    return `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Tally</th><th class="num">Total</th><th></th></tr></thead><tbody>${orders
      .map(
        (o) => `<tr><td class="cell-title">${esc(o.orderNumber)}</td><td>${esc(o.customerName)}</td><td>${esc(o.orderDate)}</td><td>${pill(o.status)}</td>
          <td>${pill(o.syncStatus)}${o.tallySyncError ? `<div class="cell-sub err" title="${esc(o.tallySyncError)}">${esc(String(o.tallySyncError).slice(0, 48))}</div>` : ''}</td>
          <td class="num">${esc(fmtNumber(o.grandTotal, 2))}</td>
          <td class="row-actions">${['pending', 'failed'].includes(o.syncStatus) ? `<button class="btn small" data-ws="${o.syncStatus === 'failed' ? 'retry' : 'sync-one'}" data-id="${esc(o.id)}">${o.syncStatus === 'failed' ? 'Retry' : 'Sync'}</button>` : ''}</td></tr>`,
      )
      .join('')}</tbody></table></div>${pager(pagination, 'orders')}`;
  });
}

async function renderCustomers() {
  mount(
    'customers',
    'Customers',
    listShell({ title: 'Customers', subtitle: 'People and companies you sell to.', toolbar: searchBox('ws-search', view.customers.search, 'Search customers') }),
  );
  await loadCustomers();
}

async function loadCustomers() {
  await fillList(async () => {
    const q = view.customers.search ? `?search=${encodeURIComponent(view.customers.search)}` : '';
    const rows = (await ctx.api(`/mobile/customers${q}`)).data;
    if (!rows.length) return emptyRow('No customers found.');
    return `<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Address</th></tr></thead><tbody>${rows
      .map(
        (c) => `<tr><td><div class="avatar-row"><span class="avatar">${esc((c.name || '?').trim().charAt(0).toUpperCase())}</span><span class="cell-title">${esc(c.name)}</span></div></td><td>${esc(c.email || '—')}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td></tr>`,
      )
      .join('')}</tbody></table></div><div class="pager"><span>${esc(fmtNumber(rows.length))} customer(s)</span></div>`;
  });
}

async function renderProducts() {
  mount(
    'products',
    'Products & stock',
    listShell({
      title: 'Products & stock',
      subtitle: 'Catalogue, selling prices and stock on hand.',
      toolbar: `${searchBox('ws-search', view.products.search, 'Search name, SKU or barcode')}
        <label class="check"><input type="checkbox" id="ws-low" ${view.products.lowOnly ? 'checked' : ''}> Low stock only</label>`,
    }),
  );
  await loadProducts();
}

async function loadProducts() {
  await fillList(async () => {
    const q = view.products.search ? `?search=${encodeURIComponent(view.products.search)}` : '';
    let rows = (await ctx.api(`/mobile/products${q}`)).data;
    if (view.products.lowOnly) rows = rows.filter((p) => p.minimumStock !== undefined ? p.stock <= p.minimumStock : p.stock <= 10);
    if (!rows.length) return emptyRow('No products found.');
    return `<div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Barcode</th><th class="num">Price</th><th>Stock</th></tr></thead><tbody>${rows
      .map(
        (p) => `<tr><td class="cell-title">${esc(p.name)}</td><td>${esc(p.sku || '—')}</td><td>${esc(p.barcode || '—')}</td><td class="num">${esc(fmtNumber(p.sellingPrice, 2))}</td>
        <td><div class="stock-cell"><span>${esc(fmtNumber(p.stock))} ${esc(p.unit || '')}</span>${stockGauge(p.stock, p.minimumStock ?? 10)}</div></td></tr>`,
      )
      .join('')}</tbody></table></div><div class="pager"><span>${esc(fmtNumber(rows.length))} product(s)</span></div>`;
  });
}

async function renderPurchasing() {
  const tab = view.purchasing.tab;
  mount(
    'purchasing',
    'Purchasing',
    listShell({
      title: 'Purchasing',
      subtitle: 'Purchase orders and the suppliers you buy from.',
      toolbar: `<div class="tabs" role="tablist">
          <button class="tab ${tab === 'orders' ? 'active' : ''}" role="tab" data-ws="tab" data-tab="orders">Purchase orders</button>
          <button class="tab ${tab === 'suppliers' ? 'active' : ''}" role="tab" data-ws="tab" data-tab="suppliers">Suppliers</button></div>
        ${tab === 'suppliers' ? searchBox('ws-search', view.purchasing.search, 'Search suppliers') : ''}`,
    }),
  );
  await loadPurchasing();
}

async function loadPurchasing() {
  await fillList(async () => {
    if (view.purchasing.tab === 'suppliers') {
      const q = new URLSearchParams({ limit: '100' });
      if (view.purchasing.search) q.set('search', view.purchasing.search);
      const res = await ctx.api(`/suppliers?${q}`);
      if (!res.data.length) return emptyRow('No suppliers found.');
      return `<div class="table-wrap"><table><thead><tr><th>Supplier</th><th>Code</th><th>Contact</th><th>Phone</th><th>Status</th></tr></thead><tbody>${res.data
        .map(
          (s) => `<tr><td class="cell-title">${esc(s.name)}</td><td>${esc(s.supplierCode || '—')}</td><td>${esc(s.contactPerson || s.email || '—')}</td><td>${esc(s.phone || s.mobile || '—')}</td><td>${pill(s.isActive ? 'active' : 'inactive')}</td></tr>`,
        )
        .join('')}</tbody></table></div>${pager(res.meta, 'suppliers')}`;
    }
    const res = await ctx.api(`/purchase-orders?page=${view.purchasing.page}&limit=20`);
    if (!res.data.length) return emptyRow('No purchase orders yet.');
    return `<div class="table-wrap"><table><thead><tr><th>PO</th><th>Date</th><th>Expected</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>${res.data
      .map(
        (p) => `<tr><td class="cell-title">${esc(p.poNumber)}</td><td>${esc(p.poDate)}</td><td>${esc(p.expectedDate || '—')}</td><td>${pill(p.status)}</td><td class="num">${esc(fmtMoney(p.grandTotal, p.currency))}</td></tr>`,
      )
      .join('')}</tbody></table></div>${pager(res.meta, 'purchasing')}`;
  });
}

async function renderTally() {
  mount('tally', 'Tally sync', loadingBlock());
  const content = document.getElementById('ws-content');
  try {
    const [status, failed, pending] = await Promise.all([
      ctx.api('/mobile/tally/status').catch((error) => ({ success: false, data: { connected: false, error: error.message } })),
      ctx.api('/mobile/sales-orders?syncStatus=failed&limit=10'),
      ctx.api('/mobile/sales-orders?syncStatus=pending&limit=10'),
    ]);
    const t = status.data || {};
    const rows = [...failed.data.orders, ...pending.data.orders];
    content.innerHTML = `
      <div class="page-head"><div><h1>Tally sync</h1><p>Connection health and orders waiting to reach Tally.</p></div>
        <div class="actions"><button class="btn secondary" data-ws="refresh">↻ Re-check</button><button class="btn primary" data-ws="sync-pending">⟳ Sync pending to Tally</button></div></div>
      <section class="kpi-grid">
        ${kpiCard({ labelText: 'Tally connection', value: t.connected ? '<span class="ok-text">Connected</span>' : '<span class="bad-text">Disconnected</span>', foot: t.connected ? `Company: ${t.companyName || '—'} · ${t.responseTimeMilliseconds ?? '?'} ms` : String(t.error || 'The Tally agent could not be reached'), tone: t.connected ? '' : 'danger' })}
        ${kpiCard({ labelText: 'Failed orders', value: esc(fmtNumber(failed.data.pagination.total)), foot: 'Need a retry', tone: failed.data.pagination.total ? 'danger' : '' })}
        ${kpiCard({ labelText: 'Pending orders', value: esc(fmtNumber(pending.data.pagination.total)), foot: 'Queued for sync' })}
      </section>
      <div class="card"><div class="section-head"><h2 class="section-title">Needs attention</h2></div>
      ${rows.length
        ? `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Tally</th><th>Attempts</th><th>Last error</th><th></th></tr></thead><tbody>${rows
            .map(
              (o) => `<tr><td class="cell-title">${esc(o.orderNumber)}</td><td>${esc(o.customerName)}</td><td>${pill(o.syncStatus)}</td><td>${esc(o.tallySyncAttempts)}</td><td class="err">${esc(o.tallySyncError || '—')}</td>
              <td class="row-actions"><button class="btn small" data-ws="${o.syncStatus === 'failed' ? 'retry' : 'sync-one'}" data-id="${esc(o.id)}">${o.syncStatus === 'failed' ? 'Retry' : 'Sync'}</button></td></tr>`,
            )
            .join('')}</tbody></table></div>`
        : emptyRow('Everything is in sync. 🎉')}</div>`;
  } catch (error) {
    content.innerHTML = failure(error);
  }
}

/* ───────────────────────── Entry points ───────────────────────── */

const renderers = {
  dashboard: renderDashboard,
  orders: renderOrders,
  customers: renderCustomers,
  products: renderProducts,
  purchasing: renderPurchasing,
  tally: renderTally,
};

export function renderWorkspace(route) {
  return (renderers[route] || renderDashboard)();
}

async function runAction(button) {
  const action = button.dataset.ws;
  const route = location.hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  try {
    if (action === 'refresh') return await renderWorkspace(route);
    if (action === 'tab') {
      view.purchasing.tab = button.dataset.tab;
      view.purchasing.page = 1;
      return await renderPurchasing();
    }
    if (action === 'page') {
      const key = button.dataset.key;
      const dir = Number(button.dataset.dir);
      if (key === 'orders') { view.orders.page = Math.max(1, view.orders.page + dir); return await loadOrders(); }
      if (key === 'purchasing') { view.purchasing.page = Math.max(1, view.purchasing.page + dir); return await loadPurchasing(); }
      return;
    }
    if (action === 'sync-pending') {
      button.disabled = true;
      const result = await ctx.api('/mobile/sales-orders/sync-pending', { method: 'POST' });
      ctx.toast(result?.message || 'Sync started.');
      return await renderWorkspace(route);
    }
    if (action === 'sync-one' || action === 'retry') {
      button.disabled = true;
      const suffix = action === 'retry' ? 'retry' : 'sync';
      const result = await ctx.api(`/mobile/sales-orders/${encodeURIComponent(button.dataset.id)}/${suffix}`, { method: 'POST' });
      ctx.toast(result?.message || 'Done.', result?.success === false ? 'error' : 'success');
      return await renderWorkspace(route);
    }
  } catch (error) {
    button.disabled = false;
    ctx.toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

function debounced(fn) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fn, 300);
}

export function initWorkspace(context) {
  ctx = context;

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-ws]') : null;
    if (target) runAction(target);
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'ws-search') return;
    const route = location.hash.replace(/^#\/?/, '').split('/')[0];
    debounced(() => {
      if (route === 'orders') { view.orders.search = input.value.trim(); view.orders.page = 1; loadOrders(); }
      if (route === 'customers') { view.customers.search = input.value.trim(); loadCustomers(); }
      if (route === 'products') { view.products.search = input.value.trim(); loadProducts(); }
      if (route === 'purchasing') { view.purchasing.search = input.value.trim(); loadPurchasing(); }
    });
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el instanceof HTMLSelectElement && el.id === 'ws-months') { view.months = Number(el.value) || 6; renderDashboard(); }
    if (el instanceof HTMLSelectElement && el.id === 'ws-sync') { view.orders.syncStatus = el.value; view.orders.page = 1; loadOrders(); }
    if (el instanceof HTMLInputElement && el.id === 'ws-low') { view.products.lowOnly = el.checked; loadProducts(); }
  });
}

export { monthLabel };
