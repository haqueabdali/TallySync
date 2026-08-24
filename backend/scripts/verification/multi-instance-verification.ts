import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    companyId: string | null;
  };
}

interface StepResult {
  name: string;
  instance: 'A' | 'B' | 'both';
  status: 'PASS' | 'FAIL';
  httpStatus?: number;
  durationMs?: number;
  detail?: string;
}

interface VerificationReport {
  generatedAt: string;
  instanceA: string;
  instanceB: string;
  protectedPath: string;
  spawnedInstances: boolean;
  appInstanceCount: number;
  compiledAppPath?: string;
  steps: StepResult[];
  passed: boolean;
}

const host = process.env.MULTI_INSTANCE_HOST?.trim() || '127.0.0.1';
const portA = readPort('MULTI_INSTANCE_PORT_A', 3100);
const portB = readPort('MULTI_INSTANCE_PORT_B', 3101);
const baseA = `http://${host}:${portA}`;
const baseB = `http://${host}:${portB}`;

const protectedPath =
  process.env.MULTI_INSTANCE_PROTECTED_PATH?.trim() ||
  '/api/v1/platform/licenses/dashboard';

const shouldSpawn = process.env.MULTI_INSTANCE_SPAWN !== 'false';
const email = process.env.MULTI_INSTANCE_EMAIL?.trim().toLowerCase();
const password = process.env.MULTI_INSTANCE_PASSWORD;

const startupTimeoutMs = readPositiveInteger(
  'MULTI_INSTANCE_STARTUP_TIMEOUT_MS',
  45_000,
);

const requestTimeoutMs = readPositiveInteger(
  'MULTI_INSTANCE_REQUEST_TIMEOUT_MS',
  15_000,
);

const steps: StepResult[] = [];
const children: ChildProcess[] = [];

let resolvedCompiledAppPath: string | undefined;

async function main(): Promise<void> {
  const backendRoot = process.cwd();
  const artifactsDir = path.join(backendRoot, 'artifacts', 'verification');

  fs.mkdirSync(artifactsDir, { recursive: true });

  try {
    if (!email || !password) {
      fail(
        'MULTI_INSTANCE_EMAIL and MULTI_INSTANCE_PASSWORD are required. ' +
          'Use a dedicated platform-admin test account where possible.',
      );
    }

    if (portA === portB) {
      fail('MULTI_INSTANCE_PORT_A and MULTI_INSTANCE_PORT_B must be different.');
    }

    if (shouldSpawn) {
      resolvedCompiledAppPath = resolveCompiledApplication(backendRoot);

      await assertPortFree(baseA);
      await assertPortFree(baseB);

      children.push(
        spawnInstance('A', portA, resolvedCompiledAppPath, artifactsDir),
        spawnInstance('B', portB, resolvedCompiledAppPath, artifactsDir),
      );
    }

    await Promise.all([
      waitForReady('A', baseA),
      waitForReady('B', baseB),
    ]);

    const login = await requestJson<AuthResponse>(
      'login on A',
      'A',
      `${baseA}/api/v1/auth/login`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      200,
    );

    assertAuthResponse(login, 'login on A');

    await requestJson(
      'A-issued access token accepted by B',
      'B',
      `${baseB}${protectedPath}`,
      bearer(login.accessToken),
      200,
    );

    const rotated = await requestJson<AuthResponse>(
      'refresh token rotated on B',
      'B',
      `${baseB}/api/v1/auth/refresh`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          refreshToken: login.refreshToken,
          userId: login.user.id,
        }),
      },
      200,
    );

    assertAuthResponse(rotated, 'refresh token rotated on B');

    await requestJson(
      'B-rotated access token accepted by A',
      'A',
      `${baseA}${protectedPath}`,
      bearer(rotated.accessToken),
      200,
    );

    await requestJson(
      'session logout on A',
      'A',
      `${baseA}/api/v1/auth/logout`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${rotated.accessToken}`,
        },
        body: JSON.stringify({
          refreshToken: rotated.refreshToken,
        }),
      },
      200,
    );

    await requestJson(
      'revoked A session rejected immediately by B',
      'B',
      `${baseB}${protectedPath}`,
      bearer(rotated.accessToken),
      401,
    );

    await Promise.all([
      requestJson(
        'instance A remains ready',
        'A',
        `${baseA}/health/ready`,
        undefined,
        200,
      ),
      requestJson(
        'instance B remains ready',
        'B',
        `${baseB}/health/ready`,
        undefined,
        200,
      ),
    ]);

    const report = buildReport(true);
    const reportPath = writeReport(artifactsDir, report);

    console.log('\nTallySync multi-instance verification PASSED.');
    console.log(`Instance A: ${baseA}`);
    console.log(`Instance B: ${baseB}`);

    if (resolvedCompiledAppPath) {
      console.log(`Compiled app: ${resolvedCompiledAppPath}`);
    }

    console.log('Cross-instance JWT: PASS');
    console.log('Cross-instance refresh rotation: PASS');
    console.log('Cross-instance session revocation: PASS');
    console.log('Post-test readiness: PASS');
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    const report = buildReport(false);
    const reportPath = writeReport(
      path.join(process.cwd(), 'artifacts', 'verification'),
      report,
    );

    console.error(`\nMulti-instance verification FAILED: ${messageOf(error)}`);
    console.error(`Report: ${reportPath}`);
    process.exitCode = 1;
  } finally {
    await stopChildren();
  }
}

function resolveCompiledApplication(backendRoot: string): string {
  const configuredPath = process.env.MULTI_INSTANCE_MAIN_JS?.trim();

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
      '',
      'Run npm run build first.',
      '',
      'If your Nest build output is somewhere else, set:',
      'MULTI_INSTANCE_MAIN_JS=relative/or/absolute/path/to/main.js',
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
    `multi-instance-${name.toLowerCase()}-${port}.log`,
  );

  const log = fs.createWriteStream(logPath, { flags: 'w' });

  const child = spawn(process.execPath, [mainJs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      APP_INSTANCE_COUNT: '2',
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
        `Instance ${name} exited unexpectedly ` +
          `(code=${code}, signal=${signal ?? 'none'}). Log: ${logPath}`,
      );
    }
  });

  return child;
}

async function waitForReady(
  name: 'A' | 'B',
  base: string,
): Promise<void> {
  const started = Date.now();
  let lastError = 'not started';

  while (Date.now() - started < startupTimeoutMs) {
    try {
      const response = await fetchWithTimeout(
        `${base}/health/ready`,
        undefined,
        3_000,
      );

      if (response.status === 200) {
        steps.push({
          name: `instance ${name} readiness`,
          instance: name,
          status: 'PASS',
          httpStatus: response.status,
          durationMs: Date.now() - started,
        });
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = messageOf(error);
    }

    await sleep(250);
  }

  steps.push({
    name: `instance ${name} readiness`,
    instance: name,
    status: 'FAIL',
    detail: lastError,
  });

  throw new Error(`Instance ${name} did not become ready: ${lastError}`);
}

async function requestJson<T = unknown>(
  name: string,
  instance: 'A' | 'B',
  url: string,
  init: RequestInit | undefined,
  expectedStatus: number,
): Promise<T> {
  const started = performance.now();

  let response: Response;

  try {
    response = await fetchWithTimeout(url, init, requestTimeoutMs);
  } catch (error) {
    const durationMs = Number((performance.now() - started).toFixed(2));

    steps.push({
      name,
      instance,
      status: 'FAIL',
      durationMs,
      detail: messageOf(error),
    });

    throw new Error(`${name}: request failed: ${messageOf(error)}`);
  }

  const durationMs = Number((performance.now() - started).toFixed(2));
  const text = await response.text();

  if (response.status !== expectedStatus) {
    steps.push({
      name,
      instance,
      status: 'FAIL',
      httpStatus: response.status,
      durationMs,
      detail: safeResponseDetail(text),
    });

    throw new Error(
      `${name}: expected HTTP ${expectedStatus}, ` +
        `received HTTP ${response.status}. ` +
        `Response: ${safeResponseDetail(text)}`,
    );
  }

  steps.push({
    name,
    instance,
    status: 'PASS',
    httpStatus: response.status,
    durationMs,
  });

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function assertAuthResponse(
  response: AuthResponse,
  stepName: string,
): void {
  if (
    !response ||
    typeof response.accessToken !== 'string' ||
    !response.accessToken ||
    typeof response.refreshToken !== 'string' ||
    !response.refreshToken ||
    !response.user ||
    typeof response.user.id !== 'string' ||
    !response.user.id
  ) {
    throw new Error(
      `${stepName}: authentication response is missing required token/user fields.`,
    );
  }
}

function bearer(accessToken: string): RequestInit {
  return {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  };
}

async function assertPortFree(base: string): Promise<void> {
  try {
    const response = await fetchWithTimeout(
      `${base}/health/live`,
      undefined,
      800,
    );

    throw new Error(
      `${base} is already serving HTTP ` +
        `(HTTP ${response.status}). ` +
        'Stop the existing process or set different ' +
        'MULTI_INSTANCE_PORT_A/B values.',
    );
  } catch (error) {
    const message = messageOf(error);

    if (message.includes('already serving HTTP')) {
      throw error;
    }

    // Connection refused / timeout means the port is available.
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...(init ?? {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildReport(passed: boolean): VerificationReport {
  return {
    generatedAt: new Date().toISOString(),
    instanceA: baseA,
    instanceB: baseB,
    protectedPath,
    spawnedInstances: shouldSpawn,
    appInstanceCount: 2,
    compiledAppPath: resolvedCompiledAppPath,
    steps,
    passed,
  };
}

function writeReport(
  artifactsDir: string,
  report: VerificationReport,
): string {
  fs.mkdirSync(artifactsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const reportPath = path.join(
    artifactsDir,
    `${stamp}-multi-instance-verification.json`,
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

          let resolved = false;

          const finish = (): void => {
            if (resolved) {
              return;
            }
            resolved = true;
            resolve();
          };

          const timer = setTimeout(() => {
            if (child.exitCode === null && child.signalCode === null) {
              try {
                child.kill('SIGKILL');
              } catch {
                // Process may already have exited.
              }
            }

            finish();
          }, 5_000);

          child.once('exit', () => {
            clearTimeout(timer);
            finish();
          });

          try {
            child.kill('SIGTERM');
          } catch {
            clearTimeout(timer);
            finish();
          }
        }),
    ),
  );
}

function readPort(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    fail(`${key} must be an integer between 1 and 65535`);
  }

  return value;
}

function readPositiveInteger(
  key: string,
  fallback: number,
): number {
  const value = Number(process.env[key] ?? fallback);

  if (!Number.isInteger(value) || value < 1) {
    fail(`${key} must be a positive integer`);
  }

  return value;
}

function safeResponseDetail(text: string): string {
  if (!text) {
    return 'empty response';
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;

    const safe = {
      statusCode: parsed.statusCode,
      error: parsed.error,
      message: parsed.message,
      path: parsed.path,
    };

    return JSON.stringify(safe);
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