import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';

const composeFile =
  process.env.DOCKER_COMPOSE_FILE?.trim() ||
  'docker-compose.production.yml';

const envFile =
  process.env.DOCKER_ENV_FILE?.trim() ||
  '.env.multi-instance';

const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  fail(`Docker environment file not found: ${envPath}`);
}

const envResult = loadEnv({
  path: envPath,
  override: true,
});

if (envResult.error) {
  fail(
    `Unable to load Docker environment file ${envPath}: ${envResult.error.message}`,
  );
}

const databaseName = requiredEnv('DATABASE_NAME');
const databaseUser = requiredEnv('DATABASE_USER');

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const artifactsDir = path.join(
  process.cwd(),
  'artifacts',
  'backups',
);

const backupPath = path.join(
  artifactsDir,
  `${timestamp}-${databaseName}.dump`,
);

const restoreDatabase =
  `${databaseName}_restore_verify_${Date.now()}`;

fs.mkdirSync(artifactsDir, {
  recursive: true,
});

async function main(): Promise<void> {
  try {
    verifyContainerIdentity();
    ensurePostgresHealthy();

    console.log(`Docker database: ${databaseName}`);
    console.log(`Docker database user: ${databaseUser}`);

    dumpDatabase();
    verifyBackupFile();

    createRestoreDatabase();

    try {
      restoreBackup();
      verifyRestoredDatabase();
    } finally {
      dropRestoreDatabase();
    }

    console.log(
      '\nTallySync PostgreSQL backup/restore verification PASSED.',
    );
    console.log(`Backup: ${backupPath}`);
    console.log(
      `Temporary restore database: ${restoreDatabase} (removed)`,
    );
  } catch (error) {
    console.error(
      `\nTallySync PostgreSQL backup/restore verification FAILED: ${messageOf(error)}`,
    );

    process.exitCode = 1;

    try {
      dropRestoreDatabase();
    } catch {
      // Best-effort cleanup only.
    }
  }
}

function verifyContainerIdentity(): void {
  const result = dockerCompose(
    [
      'exec',
      '-T',
      'postgres',
      'sh',
      '-lc',
      [
        'printf "POSTGRES_DB=%s\\n" "$POSTGRES_DB";',
        'printf "POSTGRES_USER=%s\\n" "$POSTGRES_USER";',
      ].join(' '),
    ],
    {
      encoding: 'utf8',
    },
  );

  assertDockerSuccess(
    result,
    'Unable to read PostgreSQL container identity',
  );

  const output = String(result.stdout || '');

  const containerDb =
    parseKeyValue(output, 'POSTGRES_DB');

  const containerUser =
    parseKeyValue(output, 'POSTGRES_USER');

  if (!containerDb || !containerUser) {
    fail(
      `Unable to determine POSTGRES_DB/POSTGRES_USER from the postgres container. Output: ${output.trim()}`,
    );
  }

  if (containerDb !== databaseName) {
    fail(
      `Database mismatch: .env.multi-instance DATABASE_NAME=${databaseName}, but postgres container POSTGRES_DB=${containerDb}.`,
    );
  }

  if (containerUser !== databaseUser) {
    fail(
      `Database user mismatch: .env.multi-instance DATABASE_USER=${databaseUser}, but postgres container POSTGRES_USER=${containerUser}.`,
    );
  }
}

function dumpDatabase(): void {
  const result = dockerCompose(
    [
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '-U',
      databaseUser,
      '-d',
      databaseName,
      '-Fc',
      '--no-owner',
      '--no-privileges',
    ],
    {
      encoding: null,
      maxBuffer: 256 * 1024 * 1024,
    },
  );

  assertDockerSuccess(
    result,
    'pg_dump failed',
  );

  if (!result.stdout || !Buffer.isBuffer(result.stdout)) {
    fail(
      'pg_dump did not return a binary custom-format backup.',
    );
  }

  fs.writeFileSync(
    backupPath,
    result.stdout,
  );
}

function verifyBackupFile(): void {
  const stat = fs.statSync(backupPath);

  if (stat.size < 1024) {
    fail(
      `Backup file is unexpectedly small (${stat.size} bytes).`,
    );
  }

  const result = dockerCompose(
    [
      'exec',
      '-T',
      'postgres',
      'pg_restore',
      '-l',
    ],
    {
      input: fs.readFileSync(backupPath),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  assertDockerSuccess(
    result,
    'Backup catalog verification failed',
  );

  const catalog = String(result.stdout || '');

  if (
    !catalog.includes('TABLE') &&
    !catalog.includes('TABLE DATA')
  ) {
    fail(
      'Backup catalog does not contain table entries.',
    );
  }
}

function createRestoreDatabase(): void {
  psql(
    'postgres',
    `CREATE DATABASE "${escapeIdentifier(restoreDatabase)}"`,
  );
}

function restoreBackup(): void {
  const result = dockerCompose(
    [
      'exec',
      '-T',
      'postgres',
      'pg_restore',
      '-U',
      databaseUser,
      '-d',
      restoreDatabase,
      '--no-owner',
      '--no-privileges',
      '--exit-on-error',
    ],
    {
      input: fs.readFileSync(backupPath),
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    },
  );

  assertDockerSuccess(
    result,
    'pg_restore failed',
  );
}

function verifyRestoredDatabase(): void {
  const requiredTables = [
    'users',
    'roles',
    'companies',
    'licenses',
    'typeorm_migrations',
  ];

  for (const table of requiredTables) {
    const result = psql(
      restoreDatabase,
      `SELECT to_regclass('public.${escapeSqlLiteral(table)}') IS NOT NULL`,
    );

    if (result.trim() !== 't') {
      fail(
        `Restored database is missing required table ${table}.`,
      );
    }
  }

  const sourceUsers = psql(
    databaseName,
    'SELECT COUNT(*) FROM users',
  ).trim();

  const restoredUsers = psql(
    restoreDatabase,
    'SELECT COUNT(*) FROM users',
  ).trim();

  if (sourceUsers !== restoredUsers) {
    fail(
      `User row-count mismatch: source=${sourceUsers}, restored=${restoredUsers}.`,
    );
  }

  const sourceMigrations = psql(
    databaseName,
    'SELECT COUNT(*) FROM typeorm_migrations',
  ).trim();

  const restoredMigrations = psql(
    restoreDatabase,
    'SELECT COUNT(*) FROM typeorm_migrations',
  ).trim();

  if (sourceMigrations !== restoredMigrations) {
    fail(
      `Migration row-count mismatch: source=${sourceMigrations}, restored=${restoredMigrations}.`,
    );
  }
}

function dropRestoreDatabase(): void {
  const safeLiteral =
    escapeSqlLiteral(restoreDatabase);

  const safeIdentifier =
    escapeIdentifier(restoreDatabase);

  // DROP DATABASE cannot run in the same transaction block as the
  // pg_terminate_backend SELECT, so execute them as two separate psql calls.
  psql(
    'postgres',
    [
      'SELECT pg_terminate_backend(pid)',
      'FROM pg_stat_activity',
      `WHERE datname = '${safeLiteral}'`,
      'AND pid <> pg_backend_pid()',
    ].join(' '),
  );

  psql(
    'postgres',
    `DROP DATABASE IF EXISTS "${safeIdentifier}"`,
  );
}

function ensurePostgresHealthy(): void {
  const result = dockerCompose(
    [
      'ps',
      '--status',
      'running',
      '--services',
    ],
    {
      encoding: 'utf8',
    },
  );

  assertDockerSuccess(
    result,
    'Unable to query Docker service state',
  );

  const services = String(result.stdout || '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!services.includes('postgres')) {
    fail(
      'Docker postgres service is not running.',
    );
  }
}

function psql(
  targetDatabase: string,
  sql: string,
): string {
  const result = dockerCompose(
    [
      'exec',
      '-T',
      'postgres',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-U',
      databaseUser,
      '-d',
      targetDatabase,
      '-c',
      sql,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  assertDockerSuccess(
    result,
    'psql failed',
  );

  return String(result.stdout || '');
}

function dockerCompose(
  args: string[],
  options: {
    encoding: BufferEncoding | null;
    input?: Buffer;
    maxBuffer?: number;
  },
) {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      envFile,
      '-f',
      composeFile,
      ...args,
    ],
    {
      cwd: process.cwd(),
      encoding: options.encoding,
      input: options.input,
      maxBuffer:
        options.maxBuffer ??
        64 * 1024 * 1024,
      windowsHide: true,
    },
  );

  if (result.error) {
    fail(
      `Docker command failed to start: ${messageOf(result.error)}`,
    );
  }

  return result;
}

function assertDockerSuccess(
  result: ReturnType<typeof spawnSync>,
  label: string,
): void {
  if (result.status !== 0) {
    fail(
      `${label}: ${
        bufferOrString(result.stderr).trim() ||
        bufferOrString(result.stdout).trim()
      }`,
    );
  }
}

function parseKeyValue(
  text: string,
  key: string,
): string | undefined {
  const line = text
    .split(/\r?\n/)
    .find((value) =>
      value.startsWith(`${key}=`),
    );

  if (!line) {
    return undefined;
  }

  return line.slice(key.length + 1);
}

function escapeIdentifier(
  value: string,
): string {
  return value.replace(/"/g, '""');
}

function escapeSqlLiteral(
  value: string,
): string {
  return value.replace(/'/g, "''");
}

function bufferOrString(
  value: string | Buffer | null,
): string {
  if (!value) {
    return '';
  }

  return Buffer.isBuffer(value)
    ? value.toString('utf8')
    : value;
}

function requiredEnv(
  key: string,
): string {
  const value =
    process.env[key]?.trim();

  if (!value) {
    fail(
      `${key} is required in ${envFile}.`,
    );
  }

  return value;
}

function messageOf(
  error: unknown,
): string {
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