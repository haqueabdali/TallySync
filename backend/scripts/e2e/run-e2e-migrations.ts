import 'dotenv/config';

async function main(): Promise<void> {
  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    'tallysync_e2e_test';

  process.env.DATABASE_NAME =
    databaseName;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } =
    require(
      '../../src/database/data-source',
    ) as {
      default:
        import('typeorm').DataSource;
    };

  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    console.log(
      `Running migrations against "${databaseName}"...`,
    );

    const executed =
      await dataSource.runMigrations({
        transaction: 'each',
      });

    if (!executed.length) {
      console.log(
        'No pending migrations.',
      );
    } else {
      console.log(
        `Executed ${executed.length} migration(s):`,
      );

      for (const migration of executed) {
        console.log(
          `- ${migration.name}`,
        );
      }
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.stack ?? error.message
        : 'E2E migration runner failed.',
    );

    process.exitCode = 1;
  },
);
