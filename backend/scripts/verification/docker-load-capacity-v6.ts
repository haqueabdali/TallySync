import 'dotenv/config';

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LoadSummary {
  label: string;
  requests: number;
  successful: number;
  failed: number;
  errorRate: number;
  requestsPerSecond: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  upstreams: string[];
}

interface VerificationReport {
  generatedAt: string;
  baseUrl: string;
  targetService: string;
  baseline: LoadSummary;
  degraded: LoadSummary;
  recovered: LoadSummary;
  degradedRpsRatio: number;
  degradedP95Ratio: number;
  passed: boolean;
  notes: string[];
}

const baseUrl =
  process.env.DOCKER_MULTI_INSTANCE_BASE_URL?.trim() ||
  'http://127.0.0.1:3000';

const composeFile =
  process.env.DOCKER_COMPOSE_FILE?.trim() ||
  'docker-compose.production.yml';

const envFile =
  process.env.DOCKER_ENV_FILE?.trim() ||
  '.env.multi-instance';

const targetService =
  process.env.DOCKER_FAILURE_TARGET?.trim() ||
  'api-a';

const durationSeconds = readPositiveInteger(
  'DOCKER_V6_DURATION_SECONDS',
  15,
);

const concurrency = readPositiveInteger(
  'DOCKER_V6_CONCURRENCY',
  5,
);

const maxErrorRate = readNonNegativeNumber(
  'DOCKER_V6_MAX_ERROR_RATE',
  0.01,
);

const minDegradedRpsRatio = readNonNegativeNumber(
  'DOCKER_V6_MIN_DEGRADED_RPS_RATIO',
  0.35,
);

const maxDegradedP95Ratio = readNonNegativeNumber(
  'DOCKER_V6_MAX_DEGRADED_P95_RATIO',
  3.0,
);

const startupTimeoutMs = readPositiveInteger(
  'DOCKER_V6_STARTUP_TIMEOUT_MS',
  60_000,
);

const email = process.env.MULTI_INSTANCE_EMAIL?.trim().toLowerCase();
const password = process.env.MULTI_INSTANCE_PASSWORD;
const notes: string[] = [];

async function main(): Promise<void> {
  const backendRoot = process.cwd();
  const artifactsDir = path.join(
    backendRoot,
    'artifacts',
    'verification',
  );

  fs.mkdirSync(artifactsDir, { recursive: true });

  try {
    if (!email || !password) {
      fail(
        'MULTI_INSTANCE_EMAIL and MULTI_INSTANCE_PASSWORD are required for V6.',
      );
    }

    assertFileExists(
      path.join(backendRoot, composeFile),
      `Compose file not found: ${composeFile}`,
    );

    assertFileExists(
      path.join(backendRoot, envFile),
      `Docker environment file not found: ${envFile}`,
    );

    await assertHealthyStack();

    const baseline = await runLoadPhase('baseline-two-replicas');

    compose('stop', targetService);
    await waitForServiceState(targetService, false);
    await expectHttp(`${baseUrl}/health/ready`, 200);

    const degraded = await runLoadPhase('degraded-one-replica');

    compose('start', targetService);
    await waitForServiceState(targetService, true);
    await waitForTwoUpstreams();

    const recovered = await runLoadPhase('recovered-two-replicas');

    validateLoadPhase(baseline, 'baseline');
    validateLoadPhase(degraded, 'degraded');
    validateLoadPhase(recovered, 'recovered');

    const degradedRpsRatio =
      baseline.requestsPerSecond > 0
        ? degraded.requestsPerSecond / baseline.requestsPerSecond
        : 0;

    const degradedP95Ratio =
      baseline.p95Ms > 0
        ? degraded.p95Ms / baseline.p95Ms
        : 0;

    if (degradedRpsRatio < minDegradedRpsRatio) {
      fail(
        `Degraded RPS ratio ${degradedRpsRatio.toFixed(3)} is below minimum ${minDegradedRpsRatio}.`,
      );
    }

    if (degradedP95Ratio > maxDegradedP95Ratio) {
      fail(
        `Degraded p95 ratio ${degradedP95Ratio.toFixed(3)} exceeds maximum ${maxDegradedP95Ratio}.`,
      );
    }

    if (baseline.upstreams.length < 2) {
      fail(
        `Baseline did not observe both replicas. Upstreams=${baseline.upstreams.join(', ') || 'none'}.`,
      );
    }

    if (degraded.upstreams.length !== 1) {
      fail(
        `Degraded phase expected exactly one successful upstream; observed ${degraded.upstreams.join(', ') || 'none'}.`,
      );
    }

    if (recovered.upstreams.length < 2) {
      fail(
        `Recovered phase did not observe both replicas. Upstreams=${recovered.upstreams.join(', ') || 'none'}.`,
      );
    }

    notes.push(
      'Baseline load completed through Nginx with two replicas.',
      `Degraded load completed with ${targetService} stopped.`,
      'Nginx retry chains are normalized to the final successful upstream address.',
      `${targetService} rejoined the pool and recovery load completed.`,
    );

    const report: VerificationReport = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      targetService,
      baseline,
      degraded,
      recovered,
      degradedRpsRatio: Number(degradedRpsRatio.toFixed(4)),
      degradedP95Ratio: Number(degradedP95Ratio.toFixed(4)),
      passed: true,
      notes,
    };

    const reportPath = writeReport(artifactsDir, report);

    console.log(
      '\nTallySync V6 production load/degraded-capacity verification PASSED.',
    );
    printSummary(baseline);
    printSummary(degraded);
    printSummary(recovered);
    console.log(
      `Degraded RPS ratio: ${(degradedRpsRatio * 100).toFixed(1)}%`,
    );
    console.log(
      `Degraded p95 ratio: ${degradedP95Ratio.toFixed(2)}x`,
    );
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    const reportPath = writeFailureReport(
      artifactsDir,
      messageOf(error),
    );

    console.error(
      `\nTallySync V6 production load/degraded-capacity verification FAILED: ${messageOf(error)}`,
    );
    console.error(`Report: ${reportPath}`);
    process.exitCode = 1;
  }
}

async function assertHealthyStack(): Promise<void> {
  await expectHttp(`${baseUrl}/lb-health`, 200);
  await expectHttp(`${baseUrl}/health/ready`, 200);
  await waitForTwoUpstreams();
}

async function runLoadPhase(label: string): Promise<LoadSummary> {
  const auth = await login();
  const startedAt = Date.now();
  const deadline = startedAt + durationSeconds * 1000;

  let requests = 0;
  let successful = 0;
  let failed = 0;

  const latencies: number[] = [];
  const upstreams = new Set<string>();

  async function worker(): Promise<void> {
    while (Date.now() < deadline) {
      const started = performance.now();

      try {
        const response = await fetchWithTimeout(
          `${baseUrl}/api/v1/platform/licenses/dashboard`,
          {
            headers: {
              authorization: `Bearer ${auth.accessToken}`,
              'user-agent': `TallySync-V6/${label}`,
            },
          },
          15_000,
        );

        const duration = performance.now() - started;
        latencies.push(duration);
        requests += 1;

        const finalUpstream = finalSuccessfulUpstream(
          response.headers.get('x-tallysync-upstream'),
        );

        if (finalUpstream) {
          upstreams.add(finalUpstream);
        }

        if (response.status === 200) {
          successful += 1;
        } else {
          failed += 1;
          await response.text().catch(() => '');
        }
      } catch {
        const duration = performance.now() - started;
        latencies.push(duration);
        requests += 1;
        failed += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );

  const actualSeconds = Math.max(
    (Date.now() - startedAt) / 1000,
    0.001,
  );

  const sorted = latencies.slice().sort((a, b) => a - b);

  return {
    label,
    requests,
    successful,
    failed,
    errorRate: requests > 0 ? failed / requests : 1,
    requestsPerSecond: requests / actualSeconds,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    upstreams: [...upstreams].sort(),
  };
}

async function login(): Promise<{ accessToken: string }> {
  const response = await fetchWithTimeout(
    `${baseUrl}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
    10_000,
  );

  const text = await response.text();

  if (response.status !== 200) {
    fail(
      `Platform login failed with HTTP ${response.status}: ${safeResponseDetail(text)}`,
    );
  }

  const body = JSON.parse(text) as {
    accessToken?: string;
  };

  if (!body.accessToken) {
    fail('Platform login did not return accessToken.');
  }

  return {
    accessToken: body.accessToken,
  };
}

function validateLoadPhase(
  summary: LoadSummary,
  name: string,
): void {
  if (summary.requests === 0) {
    fail(`${name} phase produced zero requests.`);
  }

  if (summary.errorRate > maxErrorRate) {
    fail(
      `${name} error rate ${(summary.errorRate * 100).toFixed(2)}% exceeded ${(maxErrorRate * 100).toFixed(2)}%.`,
    );
  }
}

async function waitForTwoUpstreams(): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    const observed = new Set<string>();

    for (let i = 0; i < 10; i += 1) {
      try {
        const response = await fetchWithTimeout(
          `${baseUrl}/health/live`,
          undefined,
          5_000,
        );

        if (response.status === 200) {
          const finalUpstream = finalSuccessfulUpstream(
            response.headers.get('x-tallysync-upstream'),
          );

          if (finalUpstream) {
            observed.add(finalUpstream);
          }
        }
      } catch {
        // Retry until deadline.
      }

      await sleep(75);
    }

    if (observed.size >= 2) {
      return;
    }

    await sleep(500);
  }

  fail('Timed out waiting for both Nginx upstream replicas.');
}

function finalSuccessfulUpstream(
  rawHeader: string | null,
): string | undefined {
  if (!rawHeader) {
    return undefined;
  }

  // Nginx $upstream_addr may contain a retry chain such as:
  // "172.19.0.3:3000, 172.19.0.4:3000"
  // when the first upstream is unavailable and the second succeeds.
  // The final address is the upstream that actually returned the response.
  const addresses = rawHeader
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return addresses.at(-1);
}

async function expectHttp(
  url: string,
  expectedStatus: number,
): Promise<void> {
  const response = await fetchWithTimeout(
    url,
    undefined,
    10_000,
  );

  if (response.status !== expectedStatus) {
    fail(
      `${url}: expected HTTP ${expectedStatus}, received ${response.status}.`,
    );
  }
}

function compose(
  command: string,
  service: string,
): void {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      envFile,
      '-f',
      composeFile,
      command,
      service,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
      windowsHide: true,
    },
  );

  if (result.error) {
    fail(
      `Failed to execute docker compose ${command} ${service}: ${messageOf(result.error)}`,
    );
  }

  if (result.status !== 0) {
    fail(
      `docker compose ${command} ${service} failed: ${(result.stderr || result.stdout || '').trim()}`,
    );
  }
}

async function waitForServiceState(
  service: string,
  running: boolean,
): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    const result = spawnSync(
      'docker',
      [
        'compose',
        '--env-file',
        envFile,
        '-f',
        composeFile,
        'ps',
        '--status',
        'running',
        '--services',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        windowsHide: true,
      },
    );

    if (result.error) {
      fail(
        `Failed to query Docker service state: ${messageOf(result.error)}`,
      );
    }

    const services = (result.stdout || '')
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (services.includes(service) === running) {
      return;
    }

    await sleep(500);
  }

  fail(
    `Timed out waiting for ${service} running=${running}.`,
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(url, {
      ...(init ?? {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function percentile(
  sorted: number[],
  fraction: number,
): number {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.max(
      0,
      Math.ceil(sorted.length * fraction) - 1,
    ),
  );

  return Number(sorted[index].toFixed(2));
}

function printSummary(
  summary: LoadSummary,
): void {
  console.log(`\n${summary.label}`);
  console.log(`Requests: ${summary.requests}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(
    `Error rate: ${(summary.errorRate * 100).toFixed(2)}%`,
  );
  console.log(
    `RPS: ${summary.requestsPerSecond.toFixed(2)}`,
  );
  console.log(
    `Latency p50/p95/p99: ${summary.p50Ms}/${summary.p95Ms}/${summary.p99Ms} ms`,
  );
  console.log(
    `Successful upstreams: ${summary.upstreams.join(', ') || 'none'}`,
  );
}

function writeReport(
  artifactsDir: string,
  report: VerificationReport,
): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const reportPath = path.join(
    artifactsDir,
    `${stamp}-docker-load-capacity-v6.json`,
  );

  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  return reportPath;
}

function writeFailureReport(
  artifactsDir: string,
  error: string,
): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const reportPath = path.join(
    artifactsDir,
    `${stamp}-docker-load-capacity-v6-failed.json`,
  );

  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        targetService,
        error,
        passed: false,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return reportPath;
}

function assertFileExists(
  filePath: string,
  message: string,
): void {
  if (!fs.existsSync(filePath)) {
    fail(message);
  }
}

function safeResponseDetail(
  text: string,
): string {
  if (!text) {
    return 'empty response';
  }

  try {
    const parsed = JSON.parse(text) as Record<
      string,
      unknown
    >;

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

function readPositiveInteger(
  key: string,
  fallback: number,
): number {
  const value = Number(
    process.env[key] ?? fallback,
  );

  if (!Number.isInteger(value) || value < 1) {
    fail(
      `${key} must be a positive integer.`,
    );
  }

  return value;
}

function readNonNegativeNumber(
  key: string,
  fallback: number,
): number {
  const value = Number(
    process.env[key] ?? fallback,
  );

  if (!Number.isFinite(value) || value < 0) {
    fail(
      `${key} must be a non-negative number.`,
    );
  }

  return value;
}

function messageOf(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    error.name === 'AbortError'
  ) {
    return 'request timed out';
  }

  return error instanceof Error
    ? error.message
    : String(error);
}

function sleep(
  ms: number,
): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function fail(
  message: string,
): never {
  throw new Error(message);
}

void main();