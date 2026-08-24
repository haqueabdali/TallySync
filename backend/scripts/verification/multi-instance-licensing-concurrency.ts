import 'dotenv/config';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    companyId: string | null;
  };
}

interface UserRow {
  id: string;
  email: string;
  company_id: string | null;
  status: string;
}

interface LicenseRow {
  id: string;
  license_number: string;
  company_id: string;
  status: string;
  max_concurrent_users: number | null;
  valid_from: string | Date | null;
  expires_at: string | Date | null;
}

interface RaceResult {
  side: 'A' | 'B';
  email: string;
  status: number;
  durationMs: number;
  body: unknown;
}

interface VerificationReport {
  generatedAt: string;
  instanceA: string;
  instanceB: string;
  companyId?: string;
  licenseId?: string;
  licenseNumber?: string;
  expectedMaxConcurrentUsers: number;
  users: Array<{ side: 'A' | 'B'; id: string; email: string }>;
  preRaceConcurrentUsers?: number;
  race: RaceResult[];
  postRaceConcurrentUsers?: number;
  cleanupConcurrentUsers?: number;
  passed: boolean;
  notes: string[];
}

const host = process.env.MULTI_INSTANCE_SEAT_HOST?.trim() || '127.0.0.1';
const portA = readPort('MULTI_INSTANCE_SEAT_PORT_A', 3200);
const portB = readPort('MULTI_INSTANCE_SEAT_PORT_B', 3201);
const baseA = `http://${host}:${portA}`;
const baseB = `http://${host}:${portB}`;

const emailA = requiredEnv('MULTI_INSTANCE_SEAT_USER_A_EMAIL').toLowerCase();
const passwordA = requiredEnv('MULTI_INSTANCE_SEAT_USER_A_PASSWORD');
const emailB = requiredEnv('MULTI_INSTANCE_SEAT_USER_B_EMAIL').toLowerCase();
const passwordB = requiredEnv('MULTI_INSTANCE_SEAT_USER_B_PASSWORD');

const startupTimeoutMs = readPositiveInteger(
  'MULTI_INSTANCE_SEAT_STARTUP_TIMEOUT_MS',
  45_000,
);
const requestTimeoutMs = readPositiveInteger(
  'MULTI_INSTANCE_SEAT_REQUEST_TIMEOUT_MS',
  15_000,
);
const activeWindowSeconds = readPositiveInteger(
  'LICENSE_SESSION_ACTIVE_WINDOW_SECONDS',
  900,
);

const children: ChildProcess[] = [];
const notes: string[] = [];
const raceResults: RaceResult[] = [];

let companyId: string | undefined;
let license: LicenseRow | undefined;
let userA: UserRow | undefined;
let userB: UserRow | undefined;
let preRaceConcurrentUsers: number | undefined;
let postRaceConcurrentUsers: number | undefined;
let cleanupConcurrentUsers: number | undefined;

async function main(): Promise<void> {
  const backendRoot = process.cwd();
  const artifactsDir = path.join(backendRoot, 'artifacts', 'verification');
  fs.mkdirSync(artifactsDir, { recursive: true });

  let db: Client | undefined;

  try {
    if (emailA === emailB) {
      fail(
        'MULTI_INSTANCE_SEAT_USER_A_EMAIL and MULTI_INSTANCE_SEAT_USER_B_EMAIL must be different users.',
      );
    }
    if (portA === portB) {
      fail(
        'MULTI_INSTANCE_SEAT_PORT_A and MULTI_INSTANCE_SEAT_PORT_B must be different.',
      );
    }

    db = await connectDatabase();

    [userA, userB] = await Promise.all([
      loadUser(db, emailA),
      loadUser(db, emailB),
    ]);

    validateTestUsers(userA, userB);
    companyId = userA.company_id as string;

    license = await loadCompanyLicense(db, companyId);
    validateLicense(license);

    preRaceConcurrentUsers = await countConcurrentUsers(db, companyId);
    if (preRaceConcurrentUsers !== 0) {
      fail(
        [
          `Company ${companyId} already has ${preRaceConcurrentUsers} active concurrent user(s).`,
          'V3 refuses to revoke or disturb existing sessions.',
          'Use a dedicated test company with maxConcurrentUsers=1 and no active sessions, then retry.',
        ].join(' '),
      );
    }

    const mainJs = resolveCompiledApplication(backendRoot);

    await assertPortFree(baseA);
    await assertPortFree(baseB);

    children.push(
      spawnInstance('A', portA, mainJs, artifactsDir),
      spawnInstance('B', portB, mainJs, artifactsDir),
    );

    await Promise.all([
      waitForReady('A', baseA),
      waitForReady('B', baseB),
    ]);

    const startGate = createStartGate(2);

    const [resultA, resultB] = await Promise.all([
      raceLogin(
        'A',
        baseA,
        emailA,
        passwordA,
        startGate,
      ),
      raceLogin(
        'B',
        baseB,
        emailB,
        passwordB,
        startGate,
      ),
    ]);

    raceResults.push(resultA, resultB);

    const successes = raceResults.filter((result) => result.status === 200);
    const denied = raceResults.filter((result) => result.status === 403);

    if (successes.length !== 1 || denied.length !== 1) {
      fail(
        [
          'Expected exactly one successful login (HTTP 200) and one concurrent-seat rejection (HTTP 403).',
          `Observed statuses: A=${resultA.status}, B=${resultB.status}.`,
        ].join(' '),
      );
    }

    postRaceConcurrentUsers = await countConcurrentUsers(db, companyId);
    if (postRaceConcurrentUsers !== 1) {
      fail(
        `Expected exactly 1 concurrent user after the race; database reports ${postRaceConcurrentUsers}.`,
      );
    }

    const winner = successes[0];
    const auth = asLoginResponse(winner.body, `${winner.side} winner`);

    await logoutWinner(
      winner.side === 'A' ? baseA : baseB,
      auth,
    );

    await waitForConcurrentUserCount(db, companyId, 0);
    cleanupConcurrentUsers = await countConcurrentUsers(db, companyId);

    if (cleanupConcurrentUsers !== 0) {
      fail(
        `Cleanup failed: expected 0 concurrent users, found ${cleanupConcurrentUsers}.`,
      );
    }

    notes.push(
      'Exactly one of two simultaneous distinct-user logins obtained the final seat.',
      'The losing instance returned HTTP 403.',
      'PostgreSQL reported exactly one distinct concurrent user after the race.',
      'The winning test session was logged out and the company returned to zero concurrent users.',
    );

    const report = buildReport(true);
    const reportPath = writeReport(artifactsDir, report);

    console.log('\nTallySync multi-instance licensing concurrency verification PASSED.');
    console.log(`Instance A: ${baseA}`);
    console.log(`Instance B: ${baseB}`);
    console.log(`Company: ${companyId}`);
    console.log(
      `License: ${license.license_number} (${license.id}), maxConcurrentUsers=${license.max_concurrent_users}`,
    );
    console.log(
      `Race: A=${resultA.status}, B=${resultB.status}`,
    );
    console.log('Final-seat double-grant prevention: PASS');
    console.log('Database distinct-seat verification: PASS');
    console.log('Cleanup: PASS');
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    const report = buildReport(false);
    const reportPath = writeReport(artifactsDir, report);

    console.error(
      `\nMulti-instance licensing concurrency verification FAILED: ${messageOf(error)}`,
    );
    console.error(`Report: ${reportPath}`);
    process.exitCode = 1;
  } finally {
    if (db) {
      await db.end().catch(() => undefined);
    }
    await stopChildren();
  }
}

async function connectDatabase(): Promise<Client> {
  const client = new Client({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME ?? 'tallysync_db',
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
  });

  await client.connect();

  const identity = await client.query<{
    database_name: string;
    database_user: string;
  }>(
    `SELECT current_database() AS database_name, current_user AS database_user`,
  );

  notes.push(
    `Database=${identity.rows[0]?.database_name ?? 'unknown'}, user=${identity.rows[0]?.database_user ?? 'unknown'}`,
  );

  return client;
}

async function loadUser(client: Client, email: string): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
      SELECT id, email, company_id, status
      FROM users
      WHERE lower(email) = lower($1)
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    fail(`Test user ${email} was not found in the current database.`);
  }
  return user;
}

function validateTestUsers(a: UserRow, b: UserRow): void {
  if (a.status !== 'active' || b.status !== 'active') {
    fail(
      `Both test users must have status=active. Found A=${a.status}, B=${b.status}.`,
    );
  }
  if (!a.company_id || !b.company_id) {
    fail('Both test users must belong to a tenant company.');
  }
  if (a.company_id !== b.company_id) {
    fail(
      `Test users must belong to the same company. A=${a.company_id}, B=${b.company_id}.`,
    );
  }
  if (a.id === b.id) {
    fail('Test users must be two distinct user records.');
  }
}

async function loadCompanyLicense(
  client: Client,
  targetCompanyId: string,
): Promise<LicenseRow> {
  const result = await client.query<LicenseRow>(
    `
      SELECT
        id,
        license_number,
        company_id,
        status,
        max_concurrent_users,
        valid_from,
        expires_at
      FROM licenses
      WHERE company_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [targetCompanyId],
  );

  const row = result.rows[0];
  if (!row) {
    fail(`Company ${targetCompanyId} does not have a non-deleted license.`);
  }
  return row;
}

function validateLicense(row: LicenseRow): void {
  if (row.status !== 'active') {
    fail(
      `Test company license must have status=active. Found ${row.status}.`,
    );
  }
  if (Number(row.max_concurrent_users) !== 1) {
    fail(
      `V3 requires maxConcurrentUsers=1. Found ${row.max_concurrent_users ?? 'null'}.`,
    );
  }

  const now = Date.now();
  if (row.valid_from && new Date(row.valid_from).getTime() > now) {
    fail('Test company license is not valid yet.');
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) {
    fail('Test company license has expired.');
  }
}

async function countConcurrentUsers(
  client: Client,
  targetCompanyId: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - activeWindowSeconds * 1000);

  const result = await client.query<{ concurrent_users: string | number }>(
    `
      SELECT COUNT(DISTINCT user_id)::int AS concurrent_users
      FROM license_sessions
      WHERE company_id = $1
        AND is_revoked = false
        AND expires_at > NOW()
        AND last_seen_at >= $2
    `,
    [targetCompanyId, cutoff],
  );

  return Number(result.rows[0]?.concurrent_users ?? 0);
}

function resolveCompiledApplication(backendRoot: string): string {
  const configuredPath = process.env.MULTI_INSTANCE_SEAT_MAIN_JS?.trim();

  const candidates = [
    configuredPath ? path.resolve(backendRoot, configuredPath) : undefined,
    path.join(backendRoot, 'dist', 'main.js'),
    path.join(backendRoot, 'dist', 'src', 'main.js'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const mainJs = candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

  if (mainJs) {
    return mainJs;
  }

  fail(
    [
      'Compiled application not found.',
      'Checked:',
      ...candidates.map((candidate) => `- ${candidate}`),
      'Run npm run build first.',
    ].join('\n'),
  );
}

function spawnInstance(
  name: 'A' | 'B',
  port: number,
  mainJs: string,
  artifactsDir: string,
): ChildProcess {
  const logPath = path.join(
    artifactsDir,
    `multi-instance-seat-${name.toLowerCase()}-${port}.log`,
  );
  const log = fs.createWriteStream(logPath, { flags: 'w' });

  const child = spawn(process.execPath, [mainJs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      APP_INSTANCE_COUNT: '2',
      LICENSE_ENFORCE_CONCURRENT_SESSIONS: 'true',
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout?.pipe(log);
  child.stderr?.pipe(log);

  child.once('error', (error) => {
    console.error(
      `Instance ${name} failed to start: ${messageOf(error)}. Log: ${logPath}`,
    );
  });

  child.once('exit', (code, signal) => {
    log.end();
    if (code && code !== 0) {
      console.error(
        `Instance ${name} exited unexpectedly (code=${code}, signal=${signal ?? 'none'}). Log: ${logPath}`,
      );
    }
  });

  return child;
}

async function waitForReady(name: 'A' | 'B', base: string): Promise<void> {
  const started = Date.now();
  let lastError = 'not started';

  while (Date.now() - started < startupTimeoutMs) {
    try {
      const response = await fetchWithTimeout(
        `${base}/health/ready`,
        undefined,
        3_000,
      );
      if (response.status === 200) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = messageOf(error);
    }
    await sleep(250);
  }

  fail(`Instance ${name} did not become ready: ${lastError}`);
}

function createStartGate(participants: number): () => Promise<void> {
  let arrived = 0;
  let release: (() => void) | undefined;

  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async () => {
    arrived += 1;
    if (arrived >= participants) {
      release?.();
    }
    await released;
  };
}

async function raceLogin(
  side: 'A' | 'B',
  base: string,
  email: string,
  password: string,
  startGate: () => Promise<void>,
): Promise<RaceResult> {
  await startGate();

  const started = performance.now();
  const response = await fetchWithTimeout(
    `${base}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': `TallySync-MultiInstance-Seat-V3/${side}`,
      },
      body: JSON.stringify({ email, password }),
    },
    requestTimeoutMs,
  );

  const durationMs = Number((performance.now() - started).toFixed(2));
  const text = await response.text();
  let body: unknown = text;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 500);
    }
  }

  return {
  side,
  email,
  status: response.status,
  durationMs,
  body,
};
}

function asLoginResponse(body: unknown, label: string): LoginResponse {
  if (!body || typeof body !== 'object') {
    fail(`${label} did not return a JSON authentication response.`);
  }

  const record = body as Record<string, unknown>;
  const user = record.user as Record<string, unknown> | undefined;

  if (
    typeof record.accessToken !== 'string' ||
    typeof record.refreshToken !== 'string' ||
    !user ||
    typeof user.id !== 'string' ||
    typeof user.email !== 'string'
  ) {
    fail(`${label} response is missing required authentication fields.`);
  }

  return record as unknown as LoginResponse;
}

async function logoutWinner(
  base: string,
  auth: LoginResponse,
): Promise<void> {
  const response = await fetchWithTimeout(
    `${base}/api/v1/auth/logout`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({
        refreshToken: auth.refreshToken,
      }),
    },
    requestTimeoutMs,
  );

  if (response.status !== 200) {
    const text = await response.text();
    fail(
      `Winner cleanup logout failed: HTTP ${response.status}: ${safeResponseDetail(text)}`,
    );
  }
}

async function waitForConcurrentUserCount(
  client: Client,
  targetCompanyId: string,
  expected: number,
): Promise<void> {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    const value = await countConcurrentUsers(client, targetCompanyId);
    if (value === expected) return;
    await sleep(100);
  }
}

async function assertPortFree(base: string): Promise<void> {
  try {
    const response = await fetchWithTimeout(
      `${base}/health/live`,
      undefined,
      800,
    );

    fail(
      `${base} is already serving HTTP (HTTP ${response.status}). Stop it or choose different V3 ports.`,
    );
  } catch (error) {
    if (messageOf(error).includes('already serving HTTP')) {
      throw error;
    }
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...(init ?? {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeBodyForReport(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;

  const record = body as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...record };

  if ('accessToken' in sanitized) sanitized.accessToken = '[REDACTED]';
  if ('refreshToken' in sanitized) sanitized.refreshToken = '[REDACTED]';

  return sanitized;
}

function buildReport(passed: boolean): VerificationReport {
  return {
    generatedAt: new Date().toISOString(),
    instanceA: baseA,
    instanceB: baseB,
    companyId,
    licenseId: license?.id,
    licenseNumber: license?.license_number,
    expectedMaxConcurrentUsers: 1,
    users: [
      ...(userA
        ? [{ side: 'A' as const, id: userA.id, email: userA.email }]
        : []),
      ...(userB
        ? [{ side: 'B' as const, id: userB.id, email: userB.email }]
        : []),
    ],
    preRaceConcurrentUsers,
    race: raceResults.map((result) => ({
  ...result,
  body: sanitizeBodyForReport(result.body),
})),
    postRaceConcurrentUsers,
    cleanupConcurrentUsers,
    passed,
    notes,
  };
}

function writeReport(
  artifactsDir: string,
  report: VerificationReport,
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(
    artifactsDir,
    `${stamp}-multi-instance-seat-v3.json`,
  );

  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  return reportPath;
}

async function stopChildren(): Promise<void> {
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          if (
            child.exitCode !== null ||
            child.signalCode !== null ||
            child.killed
          ) {
            resolve();
            return;
          }

          const timer = setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {
              // Already stopped.
            }
            resolve();
          }, 5_000);

          child.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });

          try {
            child.kill('SIGTERM');
          } catch {
            clearTimeout(timer);
            resolve();
          }
        }),
    ),
  );
}

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) fail(`${key} is required.`);
  return value;
}

function readPort(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    fail(`${key} must be an integer between 1 and 65535.`);
  }
  return value;
}

function readPositiveInteger(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value < 1) {
    fail(`${key} must be a positive integer.`);
  }
  return value;
}

function safeResponseDetail(text: string): string {
  if (!text) return 'empty response';
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return JSON.stringify({
      statusCode: parsed.statusCode,
      error: parsed.error,
      message: parsed.message,
      path: parsed.path,
    });
  } catch {
    return text.slice(0, 500);
  }
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'request timed out';
  }
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message: string): never {
  throw new Error(message);
}

void main();
