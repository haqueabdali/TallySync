import dataSource from '../src/database/data-source';

async function main(): Promise<void> {
  try {
    await dataSource.initialize();

    const hasPendingMigrations =
      await dataSource.showMigrations();

    if (hasPendingMigrations) {
      console.error(
        'Database migration check failed: pending migrations exist.',
      );
      console.error(
        'Run the project migration command before deploying the API.',
      );

      process.exitCode = 1;
      return;
    }

    console.log(
      'Database migration check passed: no pending migrations.',
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown migration check error';

  console.error(
    `Database migration check failed: ${message}`,
  );

  process.exitCode = 1;
});
