import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

const envFile =
  process.env.RELEASE_ENV_FILE?.trim() ||
  '.env.multi-instance';

const envPath =
  path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  fail(`Production environment file not found: ${envPath}`);
}

const result = loadEnv({
  path: envPath,
  override: true,
});

if (result.error) {
  fail(
    `Unable to load ${envPath}: ${result.error.message}`,
  );
}

const errors: string[] = [];
const warnings: string[] = [];

required('DATABASE_NAME');
required('DATABASE_USER');
requiredSecret('DATABASE_PASSWORD', 12);

requiredSecret('JWT_SECRET', 32);
requiredSecret('JWT_REFRESH_SECRET', 32);

required('PLATFORM_ADMIN_EMAIL');
requiredSecret('PLATFORM_ADMIN_PASSWORD', 14);

required('GRAFANA_ADMIN_USER');
requiredSecret('GRAFANA_ADMIN_PASSWORD', 12);

required('CORS_ORIGINS');

mustEqual('ENABLE_SWAGGER', 'false');
mustEqual('DATABASE_SSL', 'false', true);

mustNotEqual(
  'PLATFORM_ADMIN_PASSWORD',
  'Admin@123',
);

mustNotEqual(
  'SEED_ADMIN_PASSWORD',
  'Admin@123',
);

mustDiffer(
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
);

mustDiffer(
  'PLATFORM_ADMIN_PASSWORD',
  'SEED_ADMIN_PASSWORD',
);

const poolMax =
  positiveNumber('DATABASE_POOL_MAX', 15);

const instanceCount =
  positiveNumber('APP_INSTANCE_COUNT', 2);

const budget =
  positiveNumber(
    'DATABASE_CONNECTION_BUDGET',
    80,
  );

if (
  poolMax *
    instanceCount >
  budget
) {
  errors.push(
    `Database connection budget exceeded: ${instanceCount} × ${poolMax} = ${instanceCount * poolMax} > ${budget}.`,
  );
}

const cors =
  process.env.CORS_ORIGINS ?? '';

if (
  cors.includes('*')
) {
  errors.push(
    'CORS_ORIGINS must not contain wildcard "*" in production.',
  );
}

if (
  cors
    .split(',')
    .some(
      (origin) =>
        origin.trim().startsWith(
          'http://',
        ) &&
        !origin
          .trim()
          .includes(
            'localhost',
          ),
    )
) {
  warnings.push(
    'CORS_ORIGINS contains non-local HTTP origins. Production external origins should normally use HTTPS.',
  );
}

if (
  process.env.NODE_ENV &&
  process.env.NODE_ENV !==
    'production'
) {
  warnings.push(
    `NODE_ENV=${process.env.NODE_ENV}; Docker runtime should set NODE_ENV=production.`,
  );
}

if (
  process.env.SEED_RESET_ADMIN_PASSWORD ===
  'true'
) {
  warnings.push(
    'SEED_RESET_ADMIN_PASSWORD=true. Confirm this is intentional before release.',
  );
}

if (errors.length > 0) {
  console.error(
    '\nTallySync production configuration validation FAILED.',
  );

  for (const error of errors) {
    console.error(`- ERROR: ${error}`);
  }

  for (const warning of warnings) {
    console.error(
      `- WARN: ${warning}`,
    );
  }

  process.exitCode = 1;
} else {
  console.log(
    '\nTallySync production configuration validation PASSED.',
  );

  console.log(
    `Environment: ${envFile}`,
  );

  console.log(
    `Connection budget: ${instanceCount} × ${poolMax} = ${instanceCount * poolMax} / ${budget}`,
  );

  for (const warning of warnings) {
    console.log(
      `WARN: ${warning}`,
    );
  }
}

function required(
  key: string,
): string {
  const value =
    process.env[key]?.trim();

  if (!value) {
    errors.push(
      `${key} is required.`,
    );
    return '';
  }

  return value;
}

function requiredSecret(
  key: string,
  minimumLength: number,
): string {
  const value =
    required(key);

  if (
    value &&
    value.length <
      minimumLength
  ) {
    errors.push(
      `${key} must be at least ${minimumLength} characters.`,
    );
  }

  const normalized =
    value.toLowerCase();

  const placeholders = [
    'changeme',
    'replace-me',
    'replace_with',
    'replace-with',
    'your_password',
    'your-password',
    'password123',
    'secret123',
  ];

  if (
    placeholders.some(
      (placeholder) =>
        normalized.includes(
          placeholder,
        ),
    )
  ) {
    errors.push(
      `${key} appears to contain a placeholder/default value.`,
    );
  }

  return value;
}

function mustEqual(
  key: string,
  expected: string,
  optional = false,
): void {
  const value =
    process.env[key];

  if (
    optional &&
    value === undefined
  ) {
    return;
  }

  if (value !== expected) {
    errors.push(
      `${key} must equal ${expected}; found ${value ?? 'MISSING'}.`,
    );
  }
}

function mustNotEqual(
  key: string,
  forbidden: string,
): void {
  const value =
    process.env[key];

  if (value === forbidden) {
    errors.push(
      `${key} must not use the known default value.`,
    );
  }
}

function mustDiffer(
  a: string,
  b: string,
): void {
  const left =
    process.env[a];

  const right =
    process.env[b];

  if (
    left &&
    right &&
    left === right
  ) {
    errors.push(
      `${a} and ${b} must be different secrets.`,
    );
  }
}

function positiveNumber(
  key: string,
  fallback: number,
): number {
  const raw =
    process.env[key];

  const value =
    raw === undefined
      ? fallback
      : Number(raw);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    errors.push(
      `${key} must be a positive number.`,
    );

    return fallback;
  }

  return value;
}

function fail(
  message: string,
): never {
  throw new Error(message);
}
