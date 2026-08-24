import 'dotenv/config';
import 'reflect-metadata';

import AppDataSource from '../../src/database/data-source';
import {
  bootstrapPlatformOwner,
  readPlatformOwnerBootstrapConfig,
} from '../../src/platform-admin/platform-owner-bootstrap';

async function main(): Promise<void> {
  const config = readPlatformOwnerBootstrapConfig();
  let initializedHere = false;

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      initializedHere = true;
    }

    const result = await bootstrapPlatformOwner(AppDataSource, config);

    console.log(`Platform administrator ${result.action}.`);
    console.log(`Email: ${result.email}`);
    console.log('Role: admin');
    console.log('Company: PLATFORM (companyId = null)');
  } finally {
    if (initializedHere && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
