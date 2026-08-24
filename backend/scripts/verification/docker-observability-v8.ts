import 'dotenv/config';

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const composeFile =
  process.env.DOCKER_COMPOSE_FILE?.trim() ||
  'docker-compose.production.yml';

const overlayFile =
  process.env.DOCKER_OBSERVABILITY_FILE?.trim() ||
  'docker-compose.observability.yml';

const envFile =
  process.env.DOCKER_ENV_FILE?.trim() ||
  '.env.multi-instance';

const prometheusUrl =
  process.env.PROMETHEUS_URL?.trim() ||
  'http://127.0.0.1:9090';

const grafanaUrl =
  process.env.GRAFANA_URL?.trim() ||
  'http://127.0.0.1:3002';

async function main(): Promise<void> {
  try {
    assertFile(composeFile);
    assertFile(overlayFile);
    assertFile(envFile);

    await expectHttp(`${prometheusUrl}/-/ready`, 200);
    await expectHttp(`${grafanaUrl}/api/health`, 200);

    const targets = await fetchJson<{
      data?: {
        activeTargets?: Array<{
          labels?: Record<string, string>;
          health?: string;
        }>;
      };
    }>(`${prometheusUrl}/api/v1/targets`);

    const requiredJobs = [
      'postgres',
      'nginx',
      'tallysync-ready',
      'tallysync-live',
      'tallysync-load-balancer',
    ];

    for (const job of requiredJobs) {
      const candidates =
        targets.data?.activeTargets?.filter(
          (target) =>
            target.labels?.job === job,
        ) ?? [];

      if (candidates.length === 0) {
        fail(`Prometheus target missing: ${job}`);
      }

      if (
        candidates.every(
          (target) =>
            target.health !== 'up',
        )
      ) {
        fail(`Prometheus target is not healthy: ${job}`);
      }
    }

    const ready = await queryPrometheus(
      'probe_success{job="tallysync-ready"}',
    );

    if (ready < 1) {
      fail(
        'TallySync readiness probe is not successful.',
      );
    }

    const postgresUp = await queryPrometheus(
      'up{job="postgres"}',
    );

    if (postgresUp < 1) {
      fail(
        'PostgreSQL exporter is not up.',
      );
    }

    const nginxUp = await queryPrometheus(
      'up{job="nginx"}',
    );

    if (nginxUp < 1) {
      fail(
        'Nginx exporter is not up.',
      );
    }

    console.log(
      '\nTallySync V8 observability verification PASSED.',
    );
    console.log(`Prometheus: ${prometheusUrl}`);
    console.log(`Grafana: ${grafanaUrl}`);
    console.log('PostgreSQL metrics: PASS');
    console.log('Nginx metrics: PASS');
    console.log('Readiness/liveness probes: PASS');
  } catch (error) {
    console.error(
      `\nTallySync V8 observability verification FAILED: ${messageOf(error)}`,
    );
    printObservabilityPs();
    process.exitCode = 1;
  }
}

async function queryPrometheus(
  query: string,
): Promise<number> {
  const url =
    `${prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;

  const body = await fetchJson<{
    status?: string;
    data?: {
      result?: Array<{
        value?: [
          number,
          string,
        ];
      }>;
    };
  }>(url);

  if (body.status !== 'success') {
    fail(
      `Prometheus query failed: ${query}`,
    );
  }

  return Number(
    body.data?.result?.[0]?.value?.[1] ??
    0,
  );
}

async function fetchJson<T>(
  url: string,
): Promise<T> {
  const response =
    await fetchWithTimeout(
      url,
      10_000,
    );

  const text =
    await response.text();

  if (!response.ok) {
    fail(
      `${url} returned HTTP ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  return JSON.parse(text) as T;
}

async function expectHttp(
  url: string,
  expected: number,
): Promise<void> {
  const response =
    await fetchWithTimeout(
      url,
      10_000,
    );

  if (
    response.status !== expected
  ) {
    fail(
      `${url}: expected HTTP ${expected}, received ${response.status}`,
    );
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

  try {
    return await fetch(
      url,
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timer);
  }
}

function printObservabilityPs(): void {
  const result =
    spawnSync(
      'docker',
      [
        'compose',
        '--env-file',
        envFile,
        '-f',
        composeFile,
        '-f',
        overlayFile,
        'ps',
        '-a',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        windowsHide: true,
      },
    );

  if (result.stdout) {
    console.error(
      '\nDocker services:\n' +
      result.stdout,
    );
  }
}

function assertFile(
  value: string,
): void {
  if (
    !fs.existsSync(
      path.resolve(
        process.cwd(),
        value,
      ),
    )
  ) {
    fail(
      `Required file not found: ${value}`,
    );
  }
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

function fail(
  message: string,
): never {
  throw new Error(message);
}

void main();
