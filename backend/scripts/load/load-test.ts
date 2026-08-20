import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface CliOptions {
  profile: LoadProfile;
  durationSeconds: number;
  concurrency: number;
}

type LoadProfile = 'smoke' | 'liveness' | 'readiness' | 'platform' | 'login' | 'heartbeat';

interface RequestResult {
  name: string;
  status: number;
  latencyMs: number;
  ok: boolean;
  throttled: boolean;
  error?: string;
}

interface MetricSummary {
  requests: number;
  successful: number;
  throttled: number;
  failed: number;
  errorRate: number;
  requestsPerSecond: number;
  latencyMs: {
    min: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  statuses: Record<string, number>;
}

interface ErrorSummary {
  count: number;
  errors: Record<string, number>;
}

interface LoadReport {
  generatedAt: string;
  profile: LoadProfile;
  baseUrl: string;
  durationSeconds: number;
  concurrency: number;
  thresholds: {
    maxErrorRate: number;
    maxP95Ms: number;
  };
  summary: MetricSummary;
  byRequest: Record<string, MetricSummary>;
  errors: ErrorSummary;
  errorsByRequest: Record<string, ErrorSummary>;
  thresholdResult: {
    passed: boolean;
    failures: string[];
  };
}

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_DURATION_SECONDS = 15;
const DEFAULT_CONCURRENCY = 5;

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseProfile(value: string | undefined): LoadProfile {
  if (
    value === 'liveness' ||
    value === 'readiness' ||
    value === 'platform' ||
    value === 'login' ||
    value === 'heartbeat'
  ) {
    return value;
  }
  return 'smoke';
}

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const prefixed = args.find((arg) => arg.startsWith(`--${name}=`));
    return prefixed?.slice(name.length + 3);
  };

  return {
    profile: parseProfile(getArg('profile') ?? process.env.LOAD_PROFILE),
    durationSeconds: parsePositiveInteger(
      getArg('duration') ?? process.env.LOAD_DURATION_SECONDS,
      DEFAULT_DURATION_SECONDS,
    ),
    concurrency: parsePositiveInteger(
      getArg('concurrency') ?? process.env.LOAD_CONCURRENCY,
      DEFAULT_CONCURRENCY,
    ),
  };
}

function normalizeBaseUrl(raw: string | undefined): string {
  return (raw?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
}

function summarize(results: RequestResult[], elapsedSeconds: number): MetricSummary {
  const latencies = results.map((item) => item.latencyMs).sort((a, b) => a - b);
  const successful = results.filter((item) => item.ok).length;
  const throttled = results.filter((item) => item.throttled).length;
  const failed = results.length - successful - throttled;
  const statuses = results.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const totalLatency = latencies.reduce((sum, value) => sum + value, 0);

  return {
    requests: results.length,
    successful,
    throttled,
    failed,
    errorRate: results.length === 0 ? 0 : failed / results.length,
    requestsPerSecond:
      elapsedSeconds <= 0 ? 0 : Number((results.length / elapsedSeconds).toFixed(2)),
    latencyMs: {
      min: latencies[0] ?? 0,
      mean:
        latencies.length === 0
          ? 0
          : Number((totalLatency / latencies.length).toFixed(2)),
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: latencies[latencies.length - 1] ?? 0,
    },
    statuses,
  };
}

async function request(
  name: string,
  url: string,
  init?: RequestInit,
  options?: { allowThrottle?: boolean },
): Promise<RequestResult> {
  const started = performance.now();
  try {
    const response = await fetch(url, init);
    const latencyMs = Number((performance.now() - started).toFixed(2));
    // Consume the body so keep-alive connections behave realistically.
    await response.arrayBuffer();
    const throttled = response.status === 429 && options?.allowThrottle === true;
    return {
      name,
      status: response.status,
      latencyMs,
      ok: response.ok,
      throttled,
      ...(response.ok || throttled
        ? {}
        : { error: `${response.status} ${response.statusText}` }),
    };
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && 'cause' in error && error.cause) {
      const cause = error.cause;
      if (cause instanceof Error) {
        const code =
          'code' in cause && typeof cause.code === 'string' ? cause.code : undefined;
        message = code
          ? `${message}: ${code}: ${cause.message}`
          : `${message}: ${cause.message}`;
      } else {
        message = `${message}: ${String(cause)}`;
      }
    }
    return {
      name,
      status: 0,
      latencyMs: Number((performance.now() - started).toFixed(2)),
      ok: false,
      throttled: false,
      error: message,
    };
  }
}

async function assertHttpOk(label: string, url: string, init?: RequestInit): Promise<void> {
  const started = performance.now();
  try {
    const response = await fetch(url, init);
    await response.arrayBuffer();
    const elapsed = Number((performance.now() - started).toFixed(2));
    if (!response.ok) {
      throw new Error(`${label} preflight returned HTTP ${response.status} in ${elapsed} ms`);
    }
    console.log(`Preflight PASS: ${label} -> HTTP ${response.status} (${elapsed} ms)`);
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && 'cause' in error && error.cause instanceof Error) {
      const cause = error.cause as Error & { code?: string };
      message = `${message}${cause.code ? `: ${cause.code}` : ''}: ${cause.message}`;
    }
    throw new Error(`${label} preflight failed: ${message}`);
  }
}

async function runBasePreflight(baseUrl: string): Promise<void> {
  await assertHttpOk('health.live', `${baseUrl}/health/live`, {
    headers: { 'user-agent': 'TallySync-LoadTest/1.0' },
  });
}

async function acquireAccessToken(baseUrl: string): Promise<string> {
  const explicit = process.env.LOAD_ACCESS_TOKEN?.trim();
  if (explicit) return explicit;

  const email = process.env.LOAD_EMAIL?.trim();
  const password = process.env.LOAD_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Platform profile requires LOAD_ACCESS_TOKEN, or both LOAD_EMAIL and LOAD_PASSWORD.',
    );
  }

  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'TallySync-LoadTest/1.0' },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Unable to acquire load-test access token: HTTP ${response.status}`);
  }
  const token = payload.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Login response did not contain accessToken.');
  }
  return token;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for this profile.`);
  return value;
}

function buildHeartbeatBody(): Record<string, string> {
  return {
    activationId: requireEnv('LOAD_ACTIVATION_ID'),
    activationToken: requireEnv('LOAD_ACTIVATION_TOKEN'),
    installationId: requireEnv('LOAD_INSTALLATION_ID'),
    fingerprintHash: requireEnv('LOAD_FINGERPRINT_HASH'),
    appVersion: requireEnv('LOAD_APP_VERSION'),
  };
}

function summarizeErrors(results: RequestResult[]): ErrorSummary {
  const errors: Record<string, number> = {};
  for (const result of results) {
    if (!result.error) continue;
    const key = result.error.trim() || 'Unknown error';
    errors[key] = (errors[key] ?? 0) + 1;
  }
  return { count: Object.values(errors).reduce((sum, value) => sum + value, 0), errors };
}

function groupErrorsByRequest(results: RequestResult[]): Record<string, ErrorSummary> {
  const grouped = new Map<string, RequestResult[]>();
  for (const result of results) {
    if (!result.error) continue;
    const current = grouped.get(result.name) ?? [];
    current.push(result);
    grouped.set(result.name, current);
  }
  return Object.fromEntries(
    [...grouped.entries()].map(([name, items]) => [name, summarizeErrors(items)]),
  );
}

async function buildRequestFactory(
  profile: LoadProfile,
  baseUrl: string,
): Promise<() => Promise<RequestResult>> {
  if (profile === 'liveness') {
    return () => request('health.live', `${baseUrl}/health/live`);
  }

  if (profile === 'readiness') {
    return () => request('health.ready', `${baseUrl}/health/ready`);
  }

  if (profile === 'smoke') {
    let counter = 0;
    return () => {
      counter += 1;
      const ready = counter % 4 === 0;
      return request(
        ready ? 'health.ready' : 'health.live',
        `${baseUrl}/health/${ready ? 'ready' : 'live'}`,
      );
    };
  }

  if (profile === 'login') {
    const email = requireEnv('LOAD_EMAIL');
    const password = requireEnv('LOAD_PASSWORD');
    return () =>
      request(
        'auth.login',
        `${baseUrl}/api/v1/auth/login`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'user-agent': 'TallySync-LoadTest/1.0',
          },
          body: JSON.stringify({ email, password }),
        },
        // Auth login intentionally has a 5/minute throttle. 429 proves admission
        // control is working and is reported separately from application errors.
        { allowThrottle: true },
      );
  }

  if (profile === 'heartbeat') {
    const body = buildHeartbeatBody();
    return () =>
      request('license.heartbeat', `${baseUrl}/api/v1/license-runtime/heartbeat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'TallySync-LoadTest/1.0',
        },
        body: JSON.stringify(body),
      });
  }

  const token = await acquireAccessToken(baseUrl);
  await assertHttpOk(
    'platform.dashboard',
    `${baseUrl}/api/v1/platform/licenses/dashboard`,
    { headers: { authorization: `Bearer ${token}`, 'user-agent': 'TallySync-LoadTest/1.0' } },
  );
  const licenseId = process.env.LOAD_LICENSE_ID?.trim();
  let counter = 0;
  return () => {
    counter += 1;
    const useUsage = Boolean(licenseId) && counter % 3 === 0;
    const url = useUsage
      ? `${baseUrl}/api/v1/platform/licenses/${encodeURIComponent(licenseId!)}/usage`
      : `${baseUrl}/api/v1/platform/licenses/dashboard`;
    return request(
      useUsage ? 'platform.licenseUsage' : 'platform.dashboard',
      url,
      { headers: { authorization: `Bearer ${token}`, 'user-agent': 'TallySync-LoadTest/1.0' } },
    );
  };
}

async function runWorker(
  deadline: number,
  factory: () => Promise<RequestResult>,
  results: RequestResult[],
): Promise<void> {
  while (Date.now() < deadline) {
    results.push(await factory());
  }
}

function groupByRequest(results: RequestResult[], elapsedSeconds: number): Record<string, MetricSummary> {
  const grouped = new Map<string, RequestResult[]>();
  for (const result of results) {
    const current = grouped.get(result.name) ?? [];
    current.push(result);
    grouped.set(result.name, current);
  }
  return Object.fromEntries(
    [...grouped.entries()].map(([name, items]) => [name, summarize(items, elapsedSeconds)]),
  );
}

async function main(): Promise<void> {
  const options = parseCli();
  const baseUrl = normalizeBaseUrl(process.env.LOAD_BASE_URL);
  const maxErrorRate = parsePositiveNumber(process.env.LOAD_MAX_ERROR_RATE, 0.01);
  const maxP95Ms = parsePositiveNumber(process.env.LOAD_MAX_P95_MS, 1_500);

  console.log('TallySync load test');
  console.log(`Profile: ${options.profile}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Duration: ${options.durationSeconds}s`);
  console.log(`Concurrency: ${options.concurrency}`);
  if (options.profile === 'login') {
    console.log('Login 429 responses are counted as expected throttling, not application failures.');
  }

  await runBasePreflight(baseUrl);
  const factory = await buildRequestFactory(options.profile, baseUrl);
  const results: RequestResult[] = [];
  const startedAt = Date.now();
  const deadline = startedAt + options.durationSeconds * 1_000;
  await Promise.all(
    Array.from({ length: options.concurrency }, () => runWorker(deadline, factory, results)),
  );
  const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1_000);
  const summary = summarize(results, elapsedSeconds);
  const failures: string[] = [];
  if (summary.errorRate > maxErrorRate) {
    failures.push(
      `error rate ${(summary.errorRate * 100).toFixed(2)}% exceeded ${(maxErrorRate * 100).toFixed(2)}%`,
    );
  }
  if (summary.latencyMs.p95 > maxP95Ms) {
    failures.push(`p95 ${summary.latencyMs.p95}ms exceeded ${maxP95Ms}ms`);
  }

  const report: LoadReport = {
    generatedAt: new Date().toISOString(),
    profile: options.profile,
    baseUrl,
    durationSeconds: Number(elapsedSeconds.toFixed(3)),
    concurrency: options.concurrency,
    thresholds: { maxErrorRate, maxP95Ms },
    summary,
    byRequest: groupByRequest(results, elapsedSeconds),
    errors: summarizeErrors(results),
    errorsByRequest: groupErrorsByRequest(results),
    thresholdResult: { passed: failures.length === 0, failures },
  };

  const outputDir = join(process.cwd(), 'artifacts', 'load');
  await mkdir(outputDir, { recursive: true });
  const safeTimestamp = report.generatedAt.replace(/[:.]/g, '-');
  const outputPath = join(outputDir, `${safeTimestamp}-${options.profile}.json`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`Requests: ${summary.requests}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Throttled: ${summary.throttled}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`RPS: ${summary.requestsPerSecond}`);
  console.log(`Latency p50/p95/p99: ${summary.latencyMs.p50}/${summary.latencyMs.p95}/${summary.latencyMs.p99} ms`);
  console.log(`Error rate: ${(summary.errorRate * 100).toFixed(2)}%`);

  console.log('');
  console.log('Per-request results:');
  for (const [name, metrics] of Object.entries(report.byRequest)) {
    console.log(`- ${name}`);
    console.log(
      `  requests=${metrics.requests} success=${metrics.successful} throttled=${metrics.throttled} failed=${metrics.failed}`,
    );
    console.log(
      `  rps=${metrics.requestsPerSecond} p50/p95/p99=${metrics.latencyMs.p50}/${metrics.latencyMs.p95}/${metrics.latencyMs.p99}ms`,
    );
    console.log(`  statuses=${JSON.stringify(metrics.statuses)}`);
  }

  if (report.errors.count > 0) {
    console.log('');
    console.log('Transport / HTTP errors:');
    for (const [message, count] of Object.entries(report.errors.errors).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count} x ${message}`);
    }
  }

  console.log(`Report: ${outputPath}`);

  if (failures.length > 0) {
    console.error(`Thresholds: FAIL (${failures.join('; ')})`);
    process.exitCode = 2;
  } else {
    console.log('Thresholds: PASS');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
