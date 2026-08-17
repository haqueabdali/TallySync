export type NodeEnvironment = 'development' | 'test' | 'production';

export interface RuntimeConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigins: string[];
  enableSwagger: boolean;
  bodyLimit: string;
}

const VALID_NODE_ENV = new Set<NodeEnvironment>([
  'development',
  'test',
  'production',
]);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean environment value "${value}"`);
}

function parsePort(value: string | undefined): number {
  const port = value ? Number(value) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

function parseOrigins(value: string | undefined): string[] {
  return value?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
}

function parseBodyLimit(value: string | undefined): string {
  const result = value?.trim() || '1mb';
  if (!/^\d+(kb|mb)$/i.test(result)) {
    throw new Error('BODY_LIMIT must use kb or mb, for example 512kb or 1mb');
  }
  return result.toLowerCase();
}

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const rawNodeEnv = env.NODE_ENV?.trim() || 'development';

  if (!VALID_NODE_ENV.has(rawNodeEnv as NodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const nodeEnv = rawNodeEnv as NodeEnvironment;
  const corsOrigins = parseOrigins(env.CORS_ORIGINS);

  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (nodeEnv === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error(
      'JWT_SECRET must contain at least 32 characters in production',
    );
  }

  return {
    nodeEnv,
    port: parsePort(env.PORT),
    corsOrigins,
    enableSwagger: parseBoolean(
      env.ENABLE_SWAGGER,
      nodeEnv !== 'production',
    ),
    bodyLimit: parseBodyLimit(env.BODY_LIMIT),
  };
}
