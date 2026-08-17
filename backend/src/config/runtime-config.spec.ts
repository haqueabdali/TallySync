import { loadRuntimeConfig } from './runtime-config';

describe('loadRuntimeConfig', () => {
  it('uses development defaults', () => {
    const config = loadRuntimeConfig({ NODE_ENV: 'development' });
    expect(config.port).toBe(3000);
    expect(config.enableSwagger).toBe(true);
    expect(config.bodyLimit).toBe('1mb');
  });

  it('requires production CORS origins', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        JWT_SECRET: '12345678901234567890123456789012',
      }),
    ).toThrow('CORS_ORIGINS is required in production');
  });

  it('requires a strong production JWT secret', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://erp.example.com',
        JWT_SECRET: 'short',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters in production');
  });
});
