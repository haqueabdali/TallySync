import { ConfigService } from '@nestjs/config';

import { createDatabaseOptions } from './database-options';

describe('createDatabaseOptions', () => {
  it('always disables synchronize and migrationsRun', () => {
    const config = new ConfigService({
      NODE_ENV: 'development',
    });

    const options =
      createDatabaseOptions(config);

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.autoLoadEntities).toBe(true);
  });

  it('requires database password in production', () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      DATABASE_HOST: 'db',
      DATABASE_NAME: 'tallysync',
      DATABASE_USER: 'app',
    });

    expect(() =>
      createDatabaseOptions(config),
    ).toThrow(
      'DATABASE_PASSWORD is required in production',
    );
  });

  it('uses certificate verification by default when SSL is enabled', () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      DATABASE_HOST: 'db',
      DATABASE_NAME: 'tallysync',
      DATABASE_USER: 'app',
      DATABASE_PASSWORD:
        'secure-database-password',
      DATABASE_SSL: 'true',
    });

    const options =
      createDatabaseOptions(config);

    expect(options.ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it('supports explicit SSL certificate verification override', () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      DATABASE_HOST: 'db',
      DATABASE_NAME: 'tallysync',
      DATABASE_USER: 'app',
      DATABASE_PASSWORD:
        'secure-database-password',
      DATABASE_SSL: 'true',
      DATABASE_SSL_REJECT_UNAUTHORIZED:
        'false',
    });

    const options =
      createDatabaseOptions(config);

    expect(options.ssl).toEqual({
      rejectUnauthorized: false,
    });
  });
});
