import 'dotenv/config';

interface RequestSample {
  status: number;
  upstream: string;
  durationMs: number;
}

const baseUrl =
  process.env.DOCKER_MULTI_INSTANCE_BASE_URL?.trim() ||
  'http://127.0.0.1:3000';

const samples = Number(
  process.env.DOCKER_MULTI_INSTANCE_SAMPLES ?? 20,
);

if (!Number.isInteger(samples) || samples < 2 || samples > 500) {
  throw new Error(
    'DOCKER_MULTI_INSTANCE_SAMPLES must be an integer between 2 and 500',
  );
}

async function main(): Promise<void> {
  const lb = await fetch(`${baseUrl}/lb-health`);
  if (lb.status !== 200) {
    throw new Error(`Load balancer health returned HTTP ${lb.status}`);
  }

  const readiness = await fetch(`${baseUrl}/health/ready`);
  if (readiness.status !== 200) {
    throw new Error(`Proxied readiness returned HTTP ${readiness.status}`);
  }

  const results: RequestSample[] = [];

  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}/health/live`, {
      headers: {
        connection: 'close',
        'x-request-id': `docker-v4-${Date.now()}-${index}`,
      },
    });

    results.push({
      status: response.status,
      upstream:
        response.headers.get('x-tallysync-upstream') ?? 'missing',
      durationMs: Number((performance.now() - started).toFixed(2)),
    });

    await response.text();
  }

  const failures = results.filter((result) => result.status !== 200);
  const upstreams = new Set(
    results
      .map((result) => result.upstream)
      .filter((value) => value && value !== 'missing'),
  );

  if (failures.length > 0) {
    throw new Error(
      `${failures.length}/${results.length} proxied liveness requests failed`,
    );
  }

  if (upstreams.size < 2) {
    throw new Error(
      `Expected traffic from both API replicas; observed upstreams: ${[
        ...upstreams,
      ].join(', ') || 'none'}`,
    );
  }

  const latencies = results
    .map((result) => result.durationMs)
    .sort((a, b) => a - b);

  const p95 = latencies[Math.min(
    latencies.length - 1,
    Math.floor(latencies.length * 0.95),
  )];

  console.log('TallySync Docker multi-instance smoke PASSED.');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Requests: ${results.length}`);
  console.log(`Upstreams observed: ${[...upstreams].join(', ')}`);
  console.log(`p95 latency: ${p95.toFixed(2)} ms`);
}

void main().catch((error: unknown) => {
  console.error(
    `Docker multi-instance smoke FAILED: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
