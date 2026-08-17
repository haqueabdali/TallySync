import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

function parseDatabasePort(value: string | undefined): number {
  const port = Number(value ?? 5432);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'DATABASE_PORT must be an integer between 1 and 65535',
    );
  }

  return port;
}

function parseBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(
    `Invalid boolean value "${value}"`,
  );
}

export function createDatabaseOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const nodeEnv =
    config.get<string>('NODE_ENV') ??
    'development';

  const host =
    config.get<string>('DATABASE_HOST') ??
    'localhost';

  const username =
    config.get<string>('DATABASE_USER') ??
    'postgres';

  const database =
    config.get<string>('DATABASE_NAME') ??
    'tallysync_db';

  const password =
    config.get<string>('DATABASE_PASSWORD');

  const sslEnabled = parseBoolean(
    config.get<string>('DATABASE_SSL'),
    false,
  );

  const rejectUnauthorized = parseBoolean(
    config.get<string>(
      'DATABASE_SSL_REJECT_UNAUTHORIZED',
    ),
    true,
  );

  if (
    nodeEnv === 'production' &&
    !password?.trim()
  ) {
    throw new Error(
      'DATABASE_PASSWORD is required in production',
    );
  }

  return {
    type: 'postgres',
    host,
    port: parseDatabasePort(
      config.get<string>('DATABASE_PORT'),
    ),
    username,
    password,
    database,

    ssl: sslEnabled
      ? {
          rejectUnauthorized,
        }
      : false,

    /*
     * Production rule:
     * database shape is changed only by migrations.
     */
    synchronize: false,

    /*
     * Never mutate the database merely because the API process starts.
     * Deployments should run migrations explicitly before application rollout.
     */
    migrationsRun: false,

    /*
     * Existing feature modules register their own entities through
     * TypeOrmModule.forFeature(). This avoids duplicating the entity registry
     * in AppModule and reduces missed-entity DI problems.
     */
    autoLoadEntities: true,

    logging:
      nodeEnv === 'development'
        ? ['error', 'warn']
        : ['error'],

    retryAttempts: 5,
    retryDelay: 3_000,

    extra: {
      max: Number(
        config.get<string>(
          'DATABASE_POOL_MAX',
        ) ?? 20,
      ),
      connectionTimeoutMillis: Number(
        config.get<string>(
          'DATABASE_CONNECTION_TIMEOUT_MS',
        ) ?? 10_000,
      ),
      idleTimeoutMillis: Number(
        config.get<string>(
          'DATABASE_IDLE_TIMEOUT_MS',
        ) ?? 30_000,
      ),
    },
  };
}
