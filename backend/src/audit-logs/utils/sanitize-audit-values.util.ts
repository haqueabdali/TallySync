const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'password_hash', 'resetToken',
  'resetTokenHash', 'reset_token', 'reset_token_hash',
  'refreshToken', 'refreshTokenHash', 'refresh_token',
  'refresh_token_hash', 'accessToken', 'access_token',
  'token', 'secret', 'clientSecret', 'client_secret',
  'apiKey', 'api_key',
]);

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (!SENSITIVE_KEYS.has(key)) {
        output[key] = sanitizeValue(nestedValue);
      }
    }
    return output;
  }

  return String(value);
}

export function sanitizeAuditValues(
  values: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!values) return null;
  return sanitizeValue(values) as Record<string, unknown>;
}
