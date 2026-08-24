'use strict';

require('reflect-metadata');

const AppDataSourceModule = require('../../dist/src/database/data-source');

const {
  bootstrapPlatformOwner,
  readPlatformOwnerBootstrapConfig,
} = require('../../dist/src/platform-admin/platform-owner-bootstrap');

const AppDataSource =
  AppDataSourceModule.default ?? AppDataSourceModule;

async function main() {
  const config = readPlatformOwnerBootstrapConfig();
  let initializedHere = false;

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      initializedHere = true;
    }

    const result = await bootstrapPlatformOwner(
      AppDataSource,
      config,
    );

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

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
