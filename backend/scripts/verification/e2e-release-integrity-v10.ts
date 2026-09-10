import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const expectedSuites = [
  'app.e2e-spec.ts',
  'bootstrap-smoke.e2e-spec.ts',
  'health.e2e-spec.ts',
  'manufacturing-accounting.e2e-spec.ts',
  'manufacturing-core-lifecycle.e2e-spec.ts',
  'manufacturing.e2e-spec.ts',
  'procure-to-pay.e2e-spec.ts',
  'sales-to-cash.e2e-spec.ts',
].sort();

const e2eDatabaseName = process.env.E2E_DATABASE_NAME?.trim();

if (!e2eDatabaseName) {
  fail('E2E_DATABASE_NAME is required.');
}

if (process.env.DATABASE_NAME !== e2eDatabaseName) {
  fail(
    `DATABASE_NAME must equal E2E_DATABASE_NAME. DATABASE_NAME=${process.env.DATABASE_NAME ?? 'MISSING'}, E2E_DATABASE_NAME=${e2eDatabaseName}`,
  );
}

const discovered = fs
  .readdirSync(path.join(process.cwd(), 'test'))
  .filter((name) => name.endsWith('.e2e-spec.ts'))
  .sort();

if (JSON.stringify(discovered) !== JSON.stringify(expectedSuites)) {
  fail(
    `Unexpected E2E suite set. Expected=${expectedSuites.join(', ')} Found=${discovered.join(', ')}`,
  );
}

const outputDir = path.join(process.cwd(), 'artifacts', 'release');
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(
  outputDir,
  `${new Date().toISOString().replace(/[:.]/g, '-')}-e2e-release-integrity.txt`,
);

const result = spawnSync(
  process.execPath,
  [
    require.resolve('jest/bin/jest'),
    '--config',
    './test/jest-e2e.json',
    '--runInBand',
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BACKGROUND_JOBS_ENABLED: 'false',
    },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  },
);

const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

fs.writeFileSync(outputPath, combined, 'utf8');
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

if (result.error) {
  fail(`Unable to start Jest: ${result.error.message}`);
}

if (result.status !== 0) {
  fail(`Jest exited with code ${String(result.status)}.`);
}

const suiteSummary = combined.match(/Test Suites:\s+(.+)/)?.[1] ?? '';

const skippedSuites = Number(
  suiteSummary.match(/(\d+)\s+skipped/)?.[1] ?? 0,
);

const passedSuites = Number(
  suiteSummary.match(/(\d+)\s+passed/)?.[1] ?? 0,
);

const totalSuites = Number(
  suiteSummary.match(/(\d+)\s+total/)?.[1] ?? 0,
);

if (skippedSuites !== 0) {
  fail(`${skippedSuites} E2E suite(s) were skipped.`);
}

if (passedSuites !== expectedSuites.length) {
  fail(`Expected ${expectedSuites.length} passed E2E suites, found ${passedSuites}.`);
}

if (totalSuites !== expectedSuites.length) {
  fail(`Expected ${expectedSuites.length} total E2E suites, found ${totalSuites}.`);
}

console.log('\nTallySync V10 E2E release integrity PASSED.');
console.log(`Database: ${e2eDatabaseName}`);
console.log(`Suites passed: ${passedSuites}/${totalSuites}`);
console.log(`Captured output: ${outputPath}`);

function fail(message: string): never {
  console.error(`\nTallySync V10 E2E release integrity FAILED: ${message}`);
  process.exit(1);
}
