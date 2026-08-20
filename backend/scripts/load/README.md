# TallySync load-test harness

This harness is intentionally dependency-light and uses the Node.js `fetch` implementation already available to the backend runtime.

## Safety

Run load tests only against a dedicated test/staging database and installation. Do not point high-concurrency profiles at production until a production load-test window is explicitly approved.

The initial profiles are deliberately non-destructive:

- `smoke`: `GET /health/live` and `GET /health/ready`.
- `platform`: authenticated `GET /api/v1/platform/licenses/dashboard`; when `LOAD_LICENSE_ID` is set, every third request exercises `GET /api/v1/platform/licenses/:id/usage`.
- `login`: `POST /api/v1/auth/login`. The existing auth throttle is expected to return HTTP 429 after its configured limit; 429 is reported as `throttled`, not as an application error.
- `heartbeat`: `POST /api/v1/license-runtime/heartbeat`. This updates the activation heartbeat timestamp and therefore must use a dedicated test activation.

## Common environment

```bash
export LOAD_BASE_URL='http://localhost:3000'
export LOAD_DURATION_SECONDS='30'
export LOAD_CONCURRENCY='10'
export LOAD_MAX_ERROR_RATE='0.01'
export LOAD_MAX_P95_MS='1500'
```

CLI arguments override duration/concurrency:

```bash
npm run load:test -- --profile=smoke --duration=30 --concurrency=10
```

## Smoke

```bash
npm run load:test:smoke -- --duration=30 --concurrency=10
```

## Platform owner reads

Prefer a pre-generated access token so the load test does not consume login throttle capacity:

```bash
export LOAD_ACCESS_TOKEN='<platform-owner-jwt>'
export LOAD_LICENSE_ID='<optional-license-uuid>'
npm run load:test:platform -- --duration=30 --concurrency=10
```

Alternatively, the harness can perform one login before the test begins:

```bash
export LOAD_EMAIL='owner@tallysync.com'
export LOAD_PASSWORD='<platform-owner-password>'
npm run load:test:platform
```

Passwords and tokens are never written to the report.

## Login admission/throttling

```bash
export LOAD_EMAIL='<dedicated-test-user-email>'
export LOAD_PASSWORD='<dedicated-test-user-password>'
npm run load:test:login -- --duration=15 --concurrency=2
```

Because `/auth/login` is intentionally throttled, this profile is for validating admission behavior and latency, not for measuring unrestricted authentication throughput.

## Installation heartbeat

```bash
export LOAD_ACTIVATION_ID='<activation-uuid>'
export LOAD_ACTIVATION_TOKEN='<activation-token>'
export LOAD_INSTALLATION_ID='<installation-id>'
export LOAD_FINGERPRINT_HASH='<32-to-128-char-fingerprint-hash>'
export LOAD_APP_VERSION='<version>'
npm run load:test:heartbeat -- --duration=30 --concurrency=5
```

## Reports

Each run writes JSON to:

```text
backend/artifacts/load/<timestamp>-<profile>.json
```

The report includes total requests, successful/throttled/failed counts, RPS, status distribution, error rate, and p50/p95/p99 latency globally and per request type.
