const CONFIG = window.TALLY_SYNC_ADMIN_CONFIG || {};
const API_BASE = String(CONFIG.API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const APP_NAME = CONFIG.APP_NAME || 'TallySync Control';
const STORAGE_KEY = 'tallysync.superadmin.session.v1';

const PLANS = ['starter', 'business', 'professional', 'manufacturing', 'enterprise', 'custom'];
const FEATURES = [
  ['accounting', 'Accounting'],
  ['inventory', 'Inventory'],
  ['sales', 'Sales'],
  ['purchase', 'Purchase'],
  ['manufacturing', 'Manufacturing'],
  ['wip', 'Work in Progress'],
  ['costing', 'Costing'],
  ['vat', 'VAT'],
  ['asset_management', 'Asset Management'],
  ['bank_reconciliation', 'Bank Reconciliation'],
  ['reporting', 'Reporting'],
  ['mobile_app', 'Mobile App'],
  ['api_access', 'API Access'],
  ['notifications', 'Notifications'],
];

const state = {
  session: readSession(),
  route: '',
};

function readSession() {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  state.session = session;
  if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(STORAGE_KEY);
}

function e(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? e(value) : date.toLocaleString();
}

function fmtShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? e(value) : date.toLocaleDateString();
}

function titleCase(value) {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badge(value) {
  const normalized = String(value || 'unknown').toLowerCase();
  return `<span class="badge ${e(normalized)}">${e(titleCase(normalized))}</span>`;
}

function toast(message, kind = 'success') {
  const root = document.getElementById('toast-root');
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  root.appendChild(node);
  window.setTimeout(() => node.remove(), 4200);
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown error');
}

async function rawFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}

async function refreshSession() {
  const session = state.session;
  if (!session?.refreshToken || !session?.user?.id) return false;

  const response = await rawFetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken, userId: session.user.id }),
  });

  if (!response.ok) {
    saveSession(null);
    return false;
  }

  const data = await response.json();
  if (data.user?.role !== 'admin' || data.user?.companyId !== null) {
    saveSession(null);
    return false;
  }
  saveSession(data);
  return true;
}

async function api(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (state.session?.accessToken) headers.set('Authorization', `Bearer ${state.session.accessToken}`);

  let response = await rawFetch(path, { ...options, headers });
  if (response.status === 401 && retry && await refreshSession()) {
    return api(path, options, false);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message || body?.error || body || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function login(email, password) {
  const response = await rawFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || 'Login failed');
  if (body.user?.role !== 'admin' || body.user?.companyId !== null) {
    throw new Error('This website is restricted to the TallySync platform administrator.');
  }
  saveSession(body);
}

async function logout() {
  const refreshToken = state.session?.refreshToken;
  try {
    if (refreshToken) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  } catch { /* local logout still wins */ }
  saveSession(null);
  location.hash = '#/login';
  render();
}

function showModal(title, body, actions = '') {
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${e(title)}" data-modal-panel>
        <div class="modal-head"><h2>${e(title)}</h2><button class="icon-btn" data-close-modal aria-label="Close">×</button></div>
        <div class="modal-body">${body}</div>
        ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
      </div>
    </div>`;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function loading() {
  return `<div class="loading"><div><div class="spinner"></div>Loading…</div></div>`;
}

function shell(content, pageTitle) {
  const user = state.session?.user;
  const route = currentRoute().name;
  return `
  <aside class="sidebar">
    <div class="brand-row"><div class="brand-mark">TS</div><div><div class="brand-title">${e(APP_NAME)}</div><div class="brand-sub">Owner control plane</div></div></div>
    <nav class="nav">
      ${navButton('dashboard', '◫', 'Dashboard', route)}
      ${navButton('companies', '▦', 'Companies', route)}
      ${navButton('licenses', '◆', 'Licenses', route)}
    </nav>
    <div class="sidebar-footer">
      <div class="user-mini"><strong>${e(user?.fullName || 'Platform Admin')}</strong><span>${e(user?.email || '')}</span></div>
      <button class="btn secondary" style="width:100%" data-action="logout">Sign out</button>
    </div>
  </aside>
  <main class="main">
    <header class="topbar"><div class="topbar-title">${e(pageTitle)}</div><span class="badge active">Platform Admin</span></header>
    <div class="content">${content}</div>
  </main>`;
}

function navButton(name, icon, label, route) {
  return `<button class="nav-button ${route === name ? 'active' : ''}" data-nav="#/${name}"><span class="nav-icon">${icon}</span>${e(label)}</button>`;
}

function currentRoute() {
  const raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
  const [name = 'dashboard', id] = raw.split('/');
  if (name === 'license' && id) return { name: 'license', id };
  if (['dashboard', 'companies', 'licenses', 'login'].includes(name)) return { name };
  return { name: 'dashboard' };
}

function renderLogin() {
  document.getElementById('app').className = 'app-shell';
  document.getElementById('app').innerHTML = `
  <div class="login-shell">
    <form class="login-card" id="login-form">
      <div class="brand-row"><div class="brand-mark">TS</div><div><div class="brand-title">${e(APP_NAME)}</div><div class="brand-sub">Commercial administration</div></div></div>
      <h1>Super Admin sign in</h1>
      <p>Only a platform-level admin with no customer company assignment can access this control plane.</p>
      <div class="field"><label>Email</label><input class="input" name="email" type="email" autocomplete="username" required></div>
      <div class="field" style="margin-top:14px"><label>Password</label><input class="input" name="password" type="password" autocomplete="current-password" minlength="8" required></div>
      <button class="btn primary" style="width:100%;margin-top:20px" type="submit">Sign in</button>
      <div id="login-error" class="form-help" style="color:var(--danger);margin-top:12px"></div>
    </form>
  </div>`;
}

async function renderDashboard() {
  const app = document.getElementById('app');
  app.className = 'app-shell authenticated';
  app.innerHTML = shell(loading(), 'Dashboard');
  try {
    const [summary, companies, licenses] = await Promise.all([
      api('/platform/licenses/dashboard'),
      api('/platform/companies?page=1&limit=5'),
      api('/platform/licenses?page=1&limit=6'),
    ]);

    const content = `
      <div class="page-head"><div><h1>Commercial control</h1><p>License health, customer companies and authorization state.</p></div><div class="actions"><button class="btn primary" data-action="new-company">+ Company</button><button class="btn" data-action="new-license">+ License</button></div></div>
      <section class="grid stats-grid">
        ${statCard('Licensed companies', summary.licensedCompanies, 'All commercial tenants')}
        ${statCard('Active licenses', summary.active, 'Currently authorized')}
        ${statCard('Suspended', summary.suspended, 'Temporarily blocked')}
        ${statCard('Revoked', summary.revoked, 'Permanently blocked')}
        ${statCard('Expired by date', summary.expiredByDate, 'Needs renewal')}
      </section>
      <section class="grid two-col">
        <div class="card">
          <div class="section-head"><h2 class="section-title">Recent licenses</h2><button class="btn small secondary" data-nav="#/licenses">View all</button></div>
          ${licenseTable(licenses.data)}
        </div>
        <div class="card">
          <div class="section-head"><h2 class="section-title">Recent companies</h2><button class="btn small secondary" data-nav="#/companies">View all</button></div>
          <div class="card-pad">${companyMiniList(companies.data)}</div>
        </div>
      </section>`;
    app.innerHTML = shell(content, 'Dashboard');
  } catch (error) {
    app.innerHTML = shell(`<div class="card card-pad"><h2>Unable to load dashboard</h2><p class="brand-sub">${e(errorMessage(error))}</p></div>`, 'Dashboard');
  }
}

function statCard(label, value, foot) {
  return `<div class="card stat"><div class="stat-label">${e(label)}</div><div class="stat-value">${e(value)}</div><div class="stat-foot">${e(foot)}</div></div>`;
}

function companyMiniList(companies) {
  if (!companies?.length) return '<div class="empty">No companies yet.</div>';
  return companies.map((company) => `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
      <div><div class="cell-title">${e(company.name)}</div><div class="cell-sub">${company.activeUsers} active users · ${company.license ? e(company.license.plan) : 'No license'}</div></div>
      ${badge(company.isActive ? 'active' : 'disabled')}
    </div>`).join('');
}

function licenseTable(licenses) {
  if (!licenses?.length) return '<div class="empty">No licenses created.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Company</th><th>License</th><th>Plan</th><th>Status</th><th>Users</th><th>Expires</th><th></th></tr></thead><tbody>${licenses.map((license) => `
    <tr><td><div class="cell-title">${e(license.company?.name || license.companyId)}</div><div class="cell-sub">${e(license.company?.tallyCompanyName || '')}</div></td>
    <td>${e(license.licenseNumber)}</td><td>${e(titleCase(license.plan))}</td><td>${badge(license.status)}</td><td>${e(license.maxUsers)} / ${license.maxConcurrentUsers == null ? '∞' : e(license.maxConcurrentUsers)} concurrent</td><td>${fmtShortDate(license.expiresAt)}</td><td><button class="btn small" data-nav="#/license/${e(license.id)}">Manage</button></td></tr>`).join('')}</tbody></table></div>`;
}

async function renderCompanies() {
  const app = document.getElementById('app');
  app.className = 'app-shell authenticated';
  app.innerHTML = shell(loading(), 'Companies');
  try {
    const result = await api('/platform/companies?page=1&limit=200');
    const content = `
      <div class="page-head"><div><h1>Customer companies</h1><p>Create tenants and control whether a company is allowed to operate.</p></div><button class="btn primary" data-action="new-company">+ New company</button></div>
      <div class="toolbar"><input class="input" id="company-filter" placeholder="Search company…"></div>
      <div class="card"><div class="table-wrap"><table id="companies-table"><thead><tr><th>Company</th><th>Active users</th><th>License</th><th>Status</th><th>Company state</th><th></th></tr></thead><tbody>
      ${result.data.map(companyRow).join('')}
      </tbody></table></div></div>`;
    app.innerHTML = shell(content, 'Companies');
  } catch (error) {
    app.innerHTML = shell(`<div class="card card-pad">${e(errorMessage(error))}</div>`, 'Companies');
  }
}

function companyRow(company) {
  return `<tr data-company-search="${e(`${company.name} ${company.tallyCompanyName}`.toLowerCase())}"><td><div class="cell-title">${e(company.name)}</div><div class="cell-sub">${e(company.tallyCompanyName)}</div></td><td>${e(company.activeUsers)}</td><td>${company.license ? `<button class="btn small" data-nav="#/license/${e(company.license.id)}">${e(company.license.licenseNumber)}</button>` : '<span class="cell-sub">Not licensed</span>'}</td><td>${company.license ? badge(company.license.status) : '—'}</td><td>${badge(company.isActive ? 'active' : 'disabled')}</td><td><button class="btn small" data-action="edit-company" data-company-id="${e(company.id)}">Edit</button>${!company.license ? ` <button class="btn small primary" data-action="new-license-for" data-company-id="${e(company.id)}">License</button>` : ''}</td></tr>`;
}

async function renderLicenses() {
  const app = document.getElementById('app');
  app.className = 'app-shell authenticated';
  app.innerHTML = shell(loading(), 'Licenses');
  try {
    const result = await api('/platform/licenses?page=1&limit=200');
    const content = `
      <div class="page-head"><div><h1>Licenses</h1><p>Commercial plans, module access, versions and signed authorization.</p></div><button class="btn primary" data-action="new-license">+ New license</button></div>
      <div class="toolbar"><input class="input" id="license-filter" placeholder="Search company or license number…"></div>
      <div class="card">${licenseTable(result.data)}</div>`;
    app.innerHTML = shell(content, 'Licenses');
  } catch (error) {
    app.innerHTML = shell(`<div class="card card-pad">${e(errorMessage(error))}</div>`, 'Licenses');
  }
}

async function renderLicenseDetail(id) {
  const app = document.getElementById('app');
  app.className = 'app-shell authenticated';
  app.innerHTML = shell(loading(), 'License');
  try {
    const [license, usage, sessions] = await Promise.all([
      api(`/platform/licenses/${id}`),
      api(`/platform/licenses/${id}/usage`),
      api(`/platform/licenses/${id}/sessions`),
    ]);
    const enabled = new Map((license.features || []).map((feature) => [feature.feature, feature]));
    const content = `
      <div class="page-head"><div><button class="btn small secondary" data-nav="#/licenses">← Licenses</button><h1 style="margin-top:12px">${e(license.company?.name || license.licenseNumber)}</h1><p>${e(license.licenseNumber)} · ${titleCase(license.plan)} · ${badge(license.status)}</p></div><div class="actions">${licenseActionButtons(license)}</div></div>
      <div class="grid two-col">
        <section class="card">
          <div class="section-head"><h2 class="section-title">Entitlement</h2><span>${license.certificateIssuedAt ? '<span class="badge active">Signed</span>' : '<span class="badge draft">Unsigned</span>'}</span></div>
          <form class="card-pad form-grid" id="license-settings-form" data-license-id="${e(id)}">
            ${selectField('Plan', 'plan', PLANS, license.plan)}
            ${numberField('Maximum users', 'maxUsers', license.maxUsers, 1)}
            ${numberField('Concurrent users', 'maxConcurrentUsers', license.maxConcurrentUsers ?? '', 1, 'Leave blank for no concurrent cap.')}
            ${textField('Minimum version', 'minimumVersion', license.minimumVersion ?? '', '1.0.0')}
            ${textField('Maximum version', 'maximumVersion', license.maximumVersion ?? '', '2.0.0')}
            ${dateField('Valid from', 'validFrom', license.validFrom)}
            ${dateField('Expires at', 'expiresAt', license.expiresAt)}
            <div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${e(license.notes ?? '')}</textarea></div>
            <div class="field full"><button class="btn primary" type="submit">Save entitlement</button><span class="form-help">Changing entitlement invalidates the old signed certificate. Sign again after saving.</span></div>
          </form>
        </section>
        <section class="grid" style="align-content:start">
          <div class="card card-pad"><h2 class="section-title">Usage</h2><div style="height:16px"></div>${usageBlock(usage)}</div>
          <div class="card card-pad"><h2 class="section-title">Certificate</h2><div style="height:14px"></div><dl class="kv"><dt>Key ID</dt><dd>${e(license.certificateKeyId || 'Unsigned')}</dd><dt>Issued</dt><dd>${fmtDate(license.certificateIssuedAt)}</dd><dt>Payload hash</dt><dd>${e(license.certificatePayloadHash || '—')}</dd></dl></div>
        </section>
      </div>
      <div style="height:18px"></div>
      <section class="card"><div class="section-head"><h2 class="section-title">Enabled modules</h2><button class="btn primary small" data-action="save-features" data-license-id="${e(id)}">Save modules</button></div><div class="card-pad switch-grid" id="feature-grid">${FEATURES.map(([key,label]) => featureSwitch(key,label,enabled.get(key))).join('')}</div></section>
      <div style="height:18px"></div>
      <section class="card"><div class="section-head"><h2 class="section-title">Authorized installations</h2><button class="btn small primary" data-action="new-activation" data-license-id="${e(id)}">+ Installation</button></div>${activationTable(license.activations || [], id)}</section>
      <div style="height:18px"></div>
      <section class="card"><div class="section-head"><h2 class="section-title">Authentication sessions</h2><span class="cell-sub">${usage.concurrentUsers} concurrent users · ${usage.activeSessions} active sessions</span></div>${sessionTable(sessions, id)}</section>`;
    app.innerHTML = shell(content, license.company?.name || 'License');
  } catch (error) {
    app.innerHTML = shell(`<div class="card card-pad"><h2>Unable to load license</h2><p class="brand-sub">${e(errorMessage(error))}</p><button class="btn" data-nav="#/licenses">Back</button></div>`, 'License');
  }
}

function usageBlock(usage) {
  const pct = Math.min(100, Math.max(0, Number(usage.userUtilizationPercent || 0)));
  const cpct = usage.concurrentUtilizationPercent == null ? 0 : Math.min(100, Math.max(0, Number(usage.concurrentUtilizationPercent)));
  return `<dl class="kv"><dt>Active users</dt><dd>${e(usage.activeUsers)} / ${e(usage.maxUsers)}</dd><dt>User utilization</dt><dd><div class="progress"><span style="width:${pct}%"></span></div><div class="cell-sub">${pct}%</div></dd><dt>Concurrent users</dt><dd>${e(usage.concurrentUsers)} / ${usage.maxConcurrentUsers == null ? '∞' : e(usage.maxConcurrentUsers)}</dd><dt>Concurrent utilization</dt><dd>${usage.maxConcurrentUsers == null ? 'Unlimited' : `<div class="progress"><span style="width:${cpct}%"></span></div><div class="cell-sub">${cpct}%</div>`}</dd><dt>Active sessions</dt><dd>${e(usage.activeSessions)}</dd><dt>Installations</dt><dd>${e(usage.activeActivations)}</dd></dl>`;
}

function licenseActionButtons(license) {
  const id = e(license.id);
  const items = [`<button class="btn" data-action="sign-license" data-license-id="${id}">Sign license</button>`];
  if (license.status !== 'active' && license.status !== 'revoked') items.push(`<button class="btn primary" data-action="license-status" data-op="activate" data-license-id="${id}">Activate</button>`);
  if (license.status === 'active') items.push(`<button class="btn warning" data-action="license-status" data-op="suspend" data-license-id="${id}">Suspend</button>`);
  if (license.status !== 'revoked') items.push(`<button class="btn danger" data-action="license-status" data-op="revoke" data-license-id="${id}">Revoke</button>`);
  return items.join('');
}

function featureSwitch(key, label, feature) {
  return `<label class="switch-row"><span class="switch-label"><strong>${e(label)}</strong><span>${e(key)}</span></span><input type="checkbox" data-feature="${e(key)}" ${feature?.enabled ? 'checked' : ''}></label>`;
}

function activationTable(activations, licenseId) {
  if (!activations.length) return '<div class="empty">No authorized installations.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Installation</th><th>Version</th><th>Status</th><th>Last seen</th><th></th></tr></thead><tbody>${activations.map((activation) => `<tr><td><div class="cell-title">${e(activation.installationId)}</div><div class="cell-sub">${e(activation.fingerprintHash)}</div></td><td>${e(activation.appVersion)}</td><td>${badge(activation.status)}</td><td>${fmtDate(activation.lastSeenAt)}</td><td>${activation.status === 'active' ? `<button class="btn small" data-action="issue-credential" data-license-id="${e(licenseId)}" data-activation-id="${e(activation.id)}">Credential</button> <button class="btn small danger" data-action="revoke-activation" data-license-id="${e(licenseId)}" data-activation-id="${e(activation.id)}">Revoke</button>` : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

function sessionTable(sessions, licenseId) {
  if (!sessions.length) return '<div class="empty">No authentication sessions.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>User</th><th>Last seen</th><th>Expires</th><th>IP</th><th>State</th><th></th></tr></thead><tbody>${sessions.map((session) => `<tr><td><div class="cell-title">${e(session.user?.fullName || session.userId)}</div><div class="cell-sub">${e(session.user?.email || '')}</div></td><td>${fmtDate(session.lastSeenAt)}</td><td>${fmtDate(session.expiresAt)}</td><td>${e(session.ipAddress || '—')}</td><td>${badge(session.isRevoked ? 'revoked' : 'active')}</td><td>${session.isRevoked ? '—' : `<button class="btn small danger" data-action="revoke-session" data-license-id="${e(licenseId)}" data-session-id="${e(session.id)}">Revoke</button>`}</td></tr>`).join('')}</tbody></table></div>`;
}

function textField(label, name, value, placeholder = '') {
  return `<div class="field"><label>${e(label)}</label><input class="input" name="${e(name)}" value="${e(value)}" placeholder="${e(placeholder)}"></div>`;
}
function numberField(label, name, value, min, help = '') {
  return `<div class="field"><label>${e(label)}</label><input class="input" name="${e(name)}" type="number" min="${e(min)}" value="${e(value)}">${help ? `<span class="form-help">${e(help)}</span>` : ''}</div>`;
}
function dateField(label, name, value) {
  const v = value ? new Date(value).toISOString().slice(0,10) : '';
  return `<div class="field"><label>${e(label)}</label><input class="input" name="${e(name)}" type="date" value="${e(v)}"></div>`;
}
function selectField(label, name, options, value) {
  return `<div class="field"><label>${e(label)}</label><select class="select" name="${e(name)}">${options.map((option) => `<option value="${e(option)}" ${option === value ? 'selected' : ''}>${e(titleCase(option))}</option>`).join('')}</select></div>`;
}

async function openNewCompanyModal() {
  showModal('Create customer company', `
    <form id="company-create-form" class="form-grid">
      <div class="field full"><label>Company name</label><input class="input" name="name" required minlength="2" maxlength="255"></div>
      <div class="field full"><label>Tally company name</label><input class="input" name="tallyCompanyName" maxlength="255"><span class="form-help">Optional. Defaults to the company name.</span></div>
      <label class="switch-row field full"><span class="switch-label"><strong>Company active</strong><span>Inactive companies cannot use an otherwise active license.</span></span><input type="checkbox" name="isActive" checked></label>
    </form>`, `<button class="btn secondary" data-close-modal>Cancel</button><button class="btn primary" data-submit-form="company-create-form">Create company</button>`);
}

async function openEditCompanyModal(id) {
  try {
    const company = await api(`/platform/companies/${id}`);
    showModal('Edit company', `
      <form id="company-edit-form" class="form-grid" data-company-id="${e(id)}">
        <div class="field full"><label>Company name</label><input class="input" name="name" required value="${e(company.name)}"></div>
        <div class="field full"><label>Tally company name</label><input class="input" name="tallyCompanyName" required value="${e(company.tallyCompanyName)}"></div>
        <label class="switch-row field full"><span class="switch-label"><strong>Company active</strong><span>Turning this off immediately makes its license unusable.</span></span><input type="checkbox" name="isActive" ${company.isActive ? 'checked' : ''}></label>
      </form>`, `<button class="btn secondary" data-close-modal>Cancel</button><button class="btn primary" data-submit-form="company-edit-form">Save</button>`);
  } catch (error) { toast(errorMessage(error), 'error'); }
}

async function openNewLicenseModal(preselectedCompanyId = '') {
  try {
    const companies = await api('/platform/companies?page=1&limit=200&isActive=true');
    const available = companies.data.filter((company) => !company.license || company.id === preselectedCompanyId);
    if (!available.length) return toast('Every active company already has a license.', 'error');
    showModal('Create company license', `
      <form id="license-create-form" class="form-grid">
        <div class="field full"><label>Company</label><select class="select" name="companyId" required>${available.map((company) => `<option value="${e(company.id)}" ${company.id === preselectedCompanyId ? 'selected' : ''}>${e(company.name)}</option>`).join('')}</select></div>
        ${selectField('Plan', 'plan', PLANS, 'business')}
        ${numberField('Maximum users', 'maxUsers', 25, 1)}
        ${numberField('Concurrent users', 'maxConcurrentUsers', 10, 1)}
        ${textField('Minimum version', 'minimumVersion', '1.0.0')}
        ${textField('Maximum version', 'maximumVersion', '1.0.0')}
        ${dateField('Valid from', 'validFrom', new Date())}
        ${dateField('Expires at', 'expiresAt', new Date(Date.now() + 365*86400000))}
        <div class="field full"><label>Modules</label><div class="switch-grid">${FEATURES.map(([key,label]) => `<label class="switch-row"><span class="switch-label"><strong>${e(label)}</strong><span>${e(key)}</span></span><input type="checkbox" data-new-feature="${e(key)}" ${['accounting','inventory','sales','purchase','reporting'].includes(key) ? 'checked' : ''}></label>`).join('')}</div></div>
        <div class="field full"><label>Notes</label><textarea class="textarea" name="notes"></textarea></div>
      </form>`, `<button class="btn secondary" data-close-modal>Cancel</button><button class="btn primary" data-submit-form="license-create-form">Create draft license</button>`);
  } catch (error) { toast(errorMessage(error), 'error'); }
}

function openNewActivationModal(licenseId) {
  showModal('Authorize installation', `
    <form id="activation-create-form" class="form-grid" data-license-id="${e(licenseId)}">
      <div class="field full"><label>Installation ID</label><input class="input" name="installationId" minlength="8" maxlength="128" required placeholder="customer-server-01"></div>
      <div class="field full"><label>Fingerprint hash</label><input class="input" name="fingerprintHash" minlength="32" maxlength="128" required placeholder="SHA-256 machine fingerprint"></div>
      <div class="field"><label>Application version</label><input class="input" name="appVersion" value="1.0.0" required></div>
    </form>`, `<button class="btn secondary" data-close-modal>Cancel</button><button class="btn primary" data-submit-form="activation-create-form">Authorize</button>`);
}

function dateToIsoOrNull(value, endOfDay = false) {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

async function submitForm(form) {
  const data = new FormData(form);
  if (form.id === 'company-create-form') {
    const body = { name: data.get('name'), tallyCompanyName: data.get('tallyCompanyName') || undefined, isActive: data.get('isActive') === 'on' };
    await api('/platform/companies', { method: 'POST', body: JSON.stringify(body) });
    closeModal(); toast('Company created.'); await render(); return;
  }
  if (form.id === 'company-edit-form') {
    const id = form.dataset.companyId;
    const body = { name: data.get('name'), tallyCompanyName: data.get('tallyCompanyName'), isActive: data.get('isActive') === 'on' };
    await api(`/platform/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    closeModal(); toast('Company updated.'); await render(); return;
  }
  if (form.id === 'license-create-form') {
    const features = [...form.querySelectorAll('[data-new-feature]')].map((input) => ({ feature: input.dataset.newFeature, enabled: input.checked }));
    const body = {
      companyId: data.get('companyId'), plan: data.get('plan'), maxUsers: Number(data.get('maxUsers')),
      maxConcurrentUsers: data.get('maxConcurrentUsers') ? Number(data.get('maxConcurrentUsers')) : null,
      minimumVersion: data.get('minimumVersion') || null, maximumVersion: data.get('maximumVersion') || null,
      validFrom: dateToIsoOrNull(data.get('validFrom')), expiresAt: dateToIsoOrNull(data.get('expiresAt'), true),
      notes: data.get('notes') || null, features,
    };
    const license = await api('/platform/licenses', { method: 'POST', body: JSON.stringify(body) });
    closeModal(); toast('Draft license created.'); location.hash = `#/license/${license.id}`; return;
  }
  if (form.id === 'activation-create-form') {
    const id = form.dataset.licenseId;
    const body = { installationId: data.get('installationId'), fingerprintHash: data.get('fingerprintHash'), appVersion: data.get('appVersion') };
    await api(`/platform/licenses/${id}/activations`, { method: 'POST', body: JSON.stringify(body) });
    closeModal(); toast('Installation authorized.'); await render(); return;
  }
}

async function handleLicenseSettings(form) {
  const data = new FormData(form);
  const id = form.dataset.licenseId;
  const body = {
    plan: data.get('plan'),
    maxUsers: Number(data.get('maxUsers')),
    maxConcurrentUsers: data.get('maxConcurrentUsers') ? Number(data.get('maxConcurrentUsers')) : null,
    minimumVersion: data.get('minimumVersion') || null,
    maximumVersion: data.get('maximumVersion') || null,
    validFrom: dateToIsoOrNull(data.get('validFrom')),
    expiresAt: dateToIsoOrNull(data.get('expiresAt'), true),
    notes: data.get('notes') || null,
  };
  await api(`/platform/licenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  toast('Entitlement updated. Sign the license again before enforcing signed certificates.');
  await render();
}

async function saveFeatures(licenseId) {
  const features = [...document.querySelectorAll('[data-feature]')].map((input) => ({ feature: input.dataset.feature, enabled: input.checked }));
  await api(`/platform/licenses/${licenseId}/features`, { method: 'PUT', body: JSON.stringify({ features }) });
  toast('Module entitlements updated. Certificate signature invalidated until re-signed.');
  await render();
}

async function runLicenseOperation(licenseId, operation) {
  if (operation === 'revoke' && !confirm('Permanently revoke this license and all active installation activations?')) return;
  await api(`/platform/licenses/${licenseId}/${operation}`, { method: 'POST' });
  toast(`License ${operation}d.`);
  await render();
}

async function signLicense(licenseId) {
  const certificate = await api(`/platform/licenses/${licenseId}/sign`, { method: 'POST' });
  toast('Cryptographically signed license issued.');
  showModal('Signed license certificate', `<dl class="kv"><dt>Key ID</dt><dd>${e(certificate.keyId)}</dd><dt>Payload hash</dt><dd>${e(certificate.payloadHash)}</dd><dt>Signature</dt><dd class="secret-box">${e(certificate.signature)}</dd></dl>`, `<button class="btn primary" data-close-modal>Done</button>`);
}

async function issueCredential(licenseId, activationId) {
  const credential = await api(`/platform/licenses/${licenseId}/activations/${activationId}/credential`, { method: 'POST' });
  showModal('Installation credential', `<p class="brand-sub">This secret is returned when issued/rotated. Copy it into the authorized installation securely.</p><div class="secret-box" id="activation-secret">${e(credential.activationToken)}</div><dl class="kv" style="margin-top:16px"><dt>Activation ID</dt><dd>${e(credential.activationId)}</dd><dt>Issued</dt><dd>${fmtDate(credential.issuedAt)}</dd></dl>`, `<button class="btn" data-action="copy-secret">Copy secret</button><button class="btn primary" data-close-modal>Done</button>`);
}

async function render() {
  const route = currentRoute();
  if (!state.session) {
    if (route.name !== 'login') location.hash = '#/login';
    renderLogin();
    return;
  }
  if (route.name === 'login') { location.hash = '#/dashboard'; return; }
  if (route.name === 'dashboard') return renderDashboard();
  if (route.name === 'companies') return renderCompanies();
  if (route.name === 'licenses') return renderLicenses();
  if (route.name === 'license') return renderLicenseDetail(route.id);
}

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  try {
    if (form.id === 'login-form') {
      const data = new FormData(form);
      await login(data.get('email'), data.get('password'));
      location.hash = '#/dashboard';
      await render();
      return;
    }
    if (form.id === 'license-settings-form') return await handleLicenseSettings(form);
    await submitForm(form);
  } catch (error) {
    const loginError = document.getElementById('login-error');
    if (form.id === 'login-form' && loginError) loginError.textContent = errorMessage(error);
    else toast(errorMessage(error), 'error');
  }
});

document.addEventListener('click', async (event) => {
  const target = event.target instanceof Element ? event.target.closest('button,[data-close-modal]') : null;
  if (!target) return;
  if (target.matches('[data-modal-panel]')) return;
  const nav = target.getAttribute('data-nav');
  if (nav) { location.hash = nav; return; }
  if (target.hasAttribute('data-close-modal')) { closeModal(); return; }
  const submitId = target.getAttribute('data-submit-form');
  if (submitId) { document.getElementById(submitId)?.requestSubmit(); return; }
  const action = target.getAttribute('data-action');
  try {
    if (action === 'logout') return await logout();
    if (action === 'new-company') return await openNewCompanyModal();
    if (action === 'edit-company') return await openEditCompanyModal(target.dataset.companyId);
    if (action === 'new-license') return await openNewLicenseModal();
    if (action === 'new-license-for') return await openNewLicenseModal(target.dataset.companyId);
    if (action === 'save-features') return await saveFeatures(target.dataset.licenseId);
    if (action === 'license-status') return await runLicenseOperation(target.dataset.licenseId, target.dataset.op);
    if (action === 'sign-license') return await signLicense(target.dataset.licenseId);
    if (action === 'new-activation') return openNewActivationModal(target.dataset.licenseId);
    if (action === 'issue-credential') return await issueCredential(target.dataset.licenseId, target.dataset.activationId);
    if (action === 'revoke-activation') {
      if (!confirm('Revoke this installation activation?')) return;
      await api(`/platform/licenses/${target.dataset.licenseId}/activations/${target.dataset.activationId}/revoke`, { method: 'POST' });
      toast('Installation revoked.'); return await render();
    }
    if (action === 'revoke-session') {
      if (!confirm('Revoke this authentication session?')) return;
      await api(`/platform/licenses/${target.dataset.licenseId}/sessions/${target.dataset.sessionId}/revoke`, { method: 'POST' });
      toast('Session revoked.'); return await render();
    }
    if (action === 'copy-secret') {
      const secret = document.getElementById('activation-secret')?.textContent || '';
      await navigator.clipboard.writeText(secret); toast('Credential copied.'); return;
    }
  } catch (error) { toast(errorMessage(error), 'error'); }
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input.id === 'company-filter') {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll('[data-company-search]').forEach((row) => row.classList.toggle('hidden', !row.dataset.companySearch.includes(query)));
  }
  if (input.id === 'license-filter') {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll('#license-filter + .card tbody tr, .card tbody tr').forEach((row) => {
      if (row.closest('#companies-table')) return;
      row.classList.toggle('hidden', !row.textContent.toLowerCase().includes(query));
    });
  }
});

document.getElementById('modal-root').addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.classList.contains('modal-backdrop')) closeModal();
});

window.addEventListener('hashchange', render);
render();
