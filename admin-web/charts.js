/* Dependency-free SVG charts. All colours come from CSS variables so the
 * charts follow the light/dark theme. Every string interpolated into markup is
 * escaped through esc(). */

const NS_W = 640;

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function fmtNumber(value, digits = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Number(value) || 0);
}

export function fmtCompact(value) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

export function fmtMoney(value, currency) {
  const amount = Number(value) || 0;
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch { /* fall through to plain number */ }
  }
  return fmtNumber(amount);
}

export function monthLabel(key) {
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return String(key);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
}

function niceMax(value) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = value / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

/** Grouped bars (sales, purchases) over months with a sales trend line. */
export function barLineChart(points, { currency = null, height = 280 } = {}) {
  if (!points.length || points.every((p) => !p.sales && !p.purchases)) {
    return emptyChart('No sales or purchases in this period yet.');
  }
  const pad = { top: 18, right: 14, bottom: 34, left: 52 };
  const w = NS_W;
  const h = height;
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const max = niceMax(Math.max(...points.flatMap((p) => [p.sales, p.purchases])));
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const group = innerW / points.length;
  const barW = Math.min(26, group * 0.3);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const grid = ticks
    .map(
      (t) => `<line class="ch-grid" x1="${pad.left}" x2="${w - pad.right}" y1="${y(t)}" y2="${y(t)}"/>` +
        `<text class="ch-axis" x="${pad.left - 8}" y="${y(t) + 4}" text-anchor="end">${esc(fmtCompact(t))}</text>`,
    )
    .join('');

  const bars = points
    .map((p, i) => {
      const cx = pad.left + group * i + group / 2;
      const sH = innerH - (y(p.sales) - pad.top);
      const pH = innerH - (y(p.purchases) - pad.top);
      const tip = `${monthLabel(p.month)} ${p.month.slice(0, 4)} — Sales ${fmtMoney(p.sales, currency)} · Purchases ${fmtMoney(p.purchases, currency)} · ${p.salesOrders} orders`;
      return `<g class="ch-hit" tabindex="0" role="img" aria-label="${esc(tip)}">
        <title>${esc(tip)}</title>
        <rect class="ch-hover" x="${cx - group / 2}" y="${pad.top}" width="${group}" height="${innerH}" rx="6"/>
        <rect class="ch-bar-a" x="${cx - barW - 2}" y="${y(p.sales)}" width="${barW}" height="${Math.max(sH, 0)}" rx="4"/>
        <rect class="ch-bar-b" x="${cx + 2}" y="${y(p.purchases)}" width="${barW}" height="${Math.max(pH, 0)}" rx="4"/>
        <text class="ch-axis" x="${cx}" y="${h - 12}" text-anchor="middle">${esc(monthLabel(p.month))}</text>
      </g>`;
    })
    .join('');

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${pad.left + group * i + group / 2 - barW / 2 - 2},${y(p.sales)}`).join(' ');

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="group" aria-label="Sales and purchases by month" preserveAspectRatio="xMidYMid meet">
    ${grid}${bars}
    <path class="ch-line" d="${line}" fill="none"/>
  </svg>
  <div class="legend"><span><i class="dot a"></i>Sales</span><span><i class="dot b"></i>Purchases</span></div>`;
}

const DONUT_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

/** Donut with centre total and a legend. items: [{label, value}] */
export function donutChart(items, { centreLabel = 'Total', labelFor = (s) => s } = {}) {
  const rows = items.filter((i) => i.value > 0);
  const total = rows.reduce((sum, i) => sum + i.value, 0);
  if (!total) return emptyChart('Nothing to show yet.');
  const r = 62;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = rows
    .map((item, idx) => {
      const len = (item.value / total) * c;
      const seg = `<circle class="ch-arc ${DONUT_COLORS[idx % DONUT_COLORS.length]}" cx="90" cy="90" r="${r}" fill="none" stroke-width="22"
        stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"><title>${esc(labelFor(item.label))}: ${esc(fmtNumber(item.value))}</title></circle>`;
      offset += len;
      return seg;
    })
    .join('');
  const legend = rows
    .map(
      (item, idx) => `<li><i class="dot ${DONUT_COLORS[idx % DONUT_COLORS.length]}"></i><span>${esc(labelFor(item.label))}</span><b>${esc(fmtNumber(item.value))}</b></li>`,
    )
    .join('');
  return `<div class="donut-wrap">
    <svg class="donut" viewBox="0 0 180 180" role="img" aria-label="${esc(centreLabel)} breakdown">
      <circle class="ch-track" cx="90" cy="90" r="${r}" fill="none" stroke-width="22"/>
      ${arcs}
      <text class="ch-centre" x="90" y="88" text-anchor="middle">${esc(fmtNumber(total))}</text>
      <text class="ch-axis" x="90" y="108" text-anchor="middle">${esc(centreLabel)}</text>
    </svg>
    <ul class="legend-list">${legend}</ul>
  </div>`;
}

/** Ranked horizontal bars. rows: [{label, value, sub}] */
export function rankBars(rows, { format = fmtNumber } = {}) {
  if (!rows.length) return emptyChart('No data yet.');
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<ul class="rank">${rows
    .map(
      (r, i) => `<li>
        <div class="rank-top"><span class="rank-name"><em>${i + 1}</em>${esc(r.label)}</span><b>${esc(format(r.value))}</b></div>
        <div class="rank-bar" role="presentation"><span style="width:${Math.max((r.value / max) * 100, 2)}%"></span></div>
        ${r.sub ? `<div class="rank-sub">${esc(r.sub)}</div>` : ''}
      </li>`,
    )
    .join('')}</ul>`;
}

/** Tiny trend line for KPI cards. */
export function sparkline(values) {
  if (values.length < 2 || values.every((v) => !v)) return '';
  const w = 120;
  const h = 34;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true" preserveAspectRatio="none"><path class="spark-area" d="${area}"/><path class="spark-line" d="${d}" fill="none"/></svg>`;
}

/** Horizontal stock gauge: current vs minimum. */
export function stockGauge(current, minimum) {
  const ratio = minimum > 0 ? Math.min(current / (minimum * 2), 1) : current > 0 ? 1 : 0;
  const cls = current <= 0 ? 'bad' : current <= minimum ? 'warn' : 'ok';
  return `<div class="gauge ${cls}" role="img" aria-label="Stock ${esc(current)} of minimum ${esc(minimum)}"><span style="width:${Math.max(ratio * 100, 3)}%"></span></div>`;
}

function emptyChart(message) {
  return `<div class="chart-empty">${esc(message)}</div>`;
}
