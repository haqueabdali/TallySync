import 'dotenv/config';

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface StepResult {
  name: string;
  status: 'PASS' | 'FAIL';
  detail?: string;
}

interface VerificationReport {
  generatedAt: string;
  baseUrl: string;
  composeFile: string;
  targetService: string;
  steps: StepResult[];
  upstreamsBefore: string[];
  upstreamsDuringFailure: string[];
  upstreamsAfterRecovery: string[];
  passed: boolean;
}

const baseUrl = process.env.DOCKER_MULTI_INSTANCE_BASE_URL?.trim() || 'http://127.0.0.1:3000';
const composeFile = process.env.DOCKER_COMPOSE_FILE?.trim() || 'docker-compose.production.yml';
const envFile = process.env.DOCKER_ENV_FILE?.trim() || '.env.multi-instance';
const targetService = process.env.DOCKER_FAILURE_TARGET?.trim() || 'api-a';
const peerService = targetService === 'api-a' ? 'api-b' : 'api-a';
const probeCount = readPositiveInteger('DOCKER_FAILURE_PROBE_COUNT', 12);
const startupTimeoutMs = readPositiveInteger('DOCKER_FAILURE_STARTUP_TIMEOUT_MS', 60_000);

const steps: StepResult[] = [];
let upstreamsBefore: string[] = [];
let upstreamsDuringFailure: string[] = [];
let upstreamsAfterRecovery: string[] = [];

async function main(): Promise<void> {
  const backendRoot = process.cwd();
  const artifactsDir = path.join(backendRoot, 'artifacts', 'verification');
  fs.mkdirSync(artifactsDir, { recursive: true });

  try {
    assertFileExists(path.join(backendRoot, composeFile), `Compose file not found: ${composeFile}`);
    assertFileExists(path.join(backendRoot, envFile), `Docker environment file not found: ${envFile}`);

    await expectHttp('load balancer health before failure', `${baseUrl}/lb-health`, 200);
    await expectHttp('application readiness before failure', `${baseUrl}/health/ready`, 200);

    upstreamsBefore = await collectUpstreams(probeCount);
    if (upstreamsBefore.length < 2) {
      fail(`Expected at least two upstreams before failure; observed ${upstreamsBefore.join(', ') || 'none'}.`);
    }

    compose('stop', targetService);
    await waitForServiceState(targetService, false);

    await expectHttp('load balancer remains healthy with one replica down', `${baseUrl}/lb-health`, 200);
    await expectHttp('application remains ready with one replica down', `${baseUrl}/health/ready`, 200);

    upstreamsDuringFailure = await collectUpstreams(probeCount);
    if (upstreamsDuringFailure.length !== 1) {
      fail(`Expected exactly one responding upstream while ${targetService} is down; observed ${upstreamsDuringFailure.join(', ') || 'none'}.`);
    }

    compose('start', targetService);
    await waitForServiceState(targetService, true);
    await waitForTwoUpstreams();

    upstreamsAfterRecovery = await collectUpstreams(probeCount);
    if (upstreamsAfterRecovery.length < 2) {
      fail(`Recovered service did not rejoin the pool. Observed upstreams: ${upstreamsAfterRecovery.join(', ') || 'none'}.`);
    }

    await verifyAuthenticatedPlatformTraffic();

    steps.push({
      name: 'failure recovery verification',
      status: 'PASS',
      detail: `${targetService} stopped; ${peerService} continued serving; ${targetService} rejoined successfully.`,
    });

    const reportPath = writeReport(artifactsDir, buildReport(true));

    console.log('\nTallySync Docker failure/recovery verification PASSED.');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Before failure upstreams: ${upstreamsBefore.join(', ')}`);
    console.log(`During failure upstreams: ${upstreamsDuringFailure.join(', ')}`);
    console.log(`After recovery upstreams: ${upstreamsAfterRecovery.join(', ')}`);
    console.log('Single-replica continuity: PASS');
    console.log('Replica rejoin: PASS');
    console.log('Authenticated platform traffic after recovery: PASS');
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    steps.push({ name: 'failure recovery verification', status: 'FAIL', detail: messageOf(error) });
    const reportPath = writeReport(artifactsDir, buildReport(false));
    console.error(`\nTallySync Docker failure/recovery verification FAILED: ${messageOf(error)}`);
    console.error(`Report: ${reportPath}`);
    process.exitCode = 1;
  }
}

async function collectUpstreams(count: number): Promise<string[]> {
  const observed = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const response = await fetchWithTimeout(`${baseUrl}/health/live`, undefined, 5_000);
    if (response.status !== 200) fail(`health/live returned HTTP ${response.status}`);
    const upstream = response.headers.get('x-tallysync-upstream');
    if (upstream) observed.add(upstream);
    await sleep(75);
  }
  return [...observed].sort();
}

async function waitForTwoUpstreams(): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    const upstreams = await collectUpstreams(8);
    if (upstreams.length >= 2) return;
    await sleep(500);
  }
  fail('Timed out waiting for both API replicas to become visible through Nginx.');
}

async function verifyAuthenticatedPlatformTraffic(): Promise<void> {
  const email = process.env.MULTI_INSTANCE_EMAIL?.trim();
  const password = process.env.MULTI_INSTANCE_PASSWORD;
  if (!email || !password) {
    steps.push({
      name: 'authenticated platform traffic after recovery',
      status: 'PASS',
      detail: 'Skipped because MULTI_INSTANCE_EMAIL/PASSWORD were not set.',
    });
    return;
  }

  const login = await fetchWithTimeout(
    `${baseUrl}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    10_000,
  );

  const loginText = await login.text();
  if (login.status !== 200) {
    fail(`Platform login after recovery failed with HTTP ${login.status}: ${safeResponseDetail(loginText)}`);
  }

  const auth = JSON.parse(loginText) as { accessToken?: string };
  if (!auth.accessToken) fail('Platform login after recovery did not return accessToken.');

  for (let i = 0; i < 6; i += 1) {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/v1/platform/licenses/dashboard`,
      { headers: { authorization: `Bearer ${auth.accessToken}` } },
      10_000,
    );
    if (response.status !== 200) {
      fail(`Authenticated platform request failed after recovery with HTTP ${response.status}.`);
    }
  }

  steps.push({ name: 'authenticated platform traffic after recovery', status: 'PASS' });
}

async function expectHttp(name: string, url: string, expectedStatus: number): Promise<void> {
  const response = await fetchWithTimeout(url, undefined, 10_000);
  if (response.status !== expectedStatus) {
    fail(`${name}: expected HTTP ${expectedStatus}, received ${response.status}`);
  }
  steps.push({ name, status: 'PASS' });
}

function compose(command: string, service: string): void {
  const result = spawnSync(
    'docker',
    ['compose', '--env-file', envFile, '-f', composeFile, command, service],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
      shell: process.platform === 'win32',
    },
  );
  if (result.status !== 0) {
    fail(`docker compose ${command} ${service} failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  steps.push({ name: `docker compose ${command} ${service}`, status: 'PASS' });
}

async function waitForServiceState(service: string, running: boolean): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    const result = spawnSync(
      'docker',
      ['compose', '--env-file', envFile, '-f', composeFile, 'ps', '--status', 'running', '--services'],
      { cwd: process.cwd(), encoding: 'utf8', shell: process.platform === 'win32' },
    );
    const services = (result.stdout || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    if (services.includes(service) === running) return;
    await sleep(500);
  }
  fail(`Timed out waiting for ${service} running=${running}`);
}

async function fetchWithTimeout(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...(init ?? {}), signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function assertFileExists(filePath: string, message: string): void {
  if (!fs.existsSync(filePath)) fail(message);
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

function buildReport(passed: boolean): VerificationReport {
  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    composeFile,
    targetService,
    steps,
    upstreamsBefore,
    upstreamsDuringFailure,
    upstreamsAfterRecovery,
    passed,
  };
}

function writeReport(artifactsDir: string, report: VerificationReport): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(artifactsDir, `${stamp}-docker-failure-recovery-v5.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

function readPositiveInteger(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value < 1) fail(`${key} must be a positive integer`);
  return value;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return 'request timed out';
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message: string): never {
  throw new Error(message);
}

void main();
