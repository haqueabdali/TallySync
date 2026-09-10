import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface Gate {
  name: string;
  npmArgs: string[];
  env?: NodeJS.ProcessEnv;
}

const npmExecPath = process.env.npm_execpath?.trim();

if (!npmExecPath) {
  console.error('npm_execpath is missing. Run with: npm run release:gate');
  process.exit(1);
}

const e2eDatabaseName =
  process.env.RELEASE_E2E_DATABASE_NAME?.trim() ||
  'tallysync_e2e_test';

const e2eEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'test',
  E2E_DATABASE_NAME: e2eDatabaseName,
  DATABASE_NAME: e2eDatabaseName,
  BACKGROUND_JOBS_ENABLED: 'false',
};

const gates: Gate[] = [
  { name: 'build', npmArgs: ['run', 'build'] },
  { name: 'unit-tests', npmArgs: ['test', '--', '--runInBand'] },
  { name: 'e2e-database-prepare', npmArgs: ['run', 'e2e:prepare'], env: e2eEnv },
  { name: 'e2e-database-migrate', npmArgs: ['run', 'e2e:migrate'], env: e2eEnv },
  { name: 'e2e-release-integrity', npmArgs: ['run', 'verify:e2e:release'], env: e2eEnv },
  { name: 'production-config', npmArgs: ['run', 'release:validate-config'] },
  { name: 'tracked-secret-scan', npmArgs: ['run', 'security:scan-secrets'] },
  { name: 'production-dependency-audit', npmArgs: ['audit', '--omit=dev', '--audit-level=high'] },
  { name: 'observability', npmArgs: ['run', 'verify:docker:observability'] },
  { name: 'backup-restore', npmArgs: ['run', 'verify:docker:backup-restore'] },
  { name: 'capacity-failover', npmArgs: ['run', 'verify:docker:capacity'] },
];

const startedAt = new Date();
const results: Array<{
  name: string;
  passed: boolean;
  durationMs: number;
  exitCode: number | null;
  error?: string;
}> = [];

let failed = false;

for (const gate of gates) {
  console.log(`\n========== ${gate.name} ==========`);

  const started = Date.now();

  const result = spawnSync(
    process.execPath,
    [npmExecPath, ...gate.npmArgs],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
      env: gate.env ?? process.env,
    },
  );

  const passed = !result.error && result.status === 0;

  results.push({
    name: gate.name,
    passed,
    durationMs: Date.now() - started,
    exitCode: result.status,
    error: result.error?.message,
  });

  if (!passed) {
    failed = true;
    console.error(`\nRELEASE GATE FAILED: ${gate.name}`);
    if (result.error) {
      console.error(`Process error: ${result.error.message}`);
    } else {
      console.error(`Exit code: ${String(result.status)}`);
    }
    break;
  }

  console.log(`RELEASE GATE PASS: ${gate.name}`);
}

const artifactsDir = path.join(process.cwd(), 'artifacts', 'release');
fs.mkdirSync(artifactsDir, { recursive: true });

const reportPath = path.join(
  artifactsDir,
  `${new Date().toISOString().replace(/[:.]/g, '-')}-release-gate-v10.json`,
);

fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      startedAt: startedAt.toISOString(),
      branch: gitValue(['branch', '--show-current']),
      commit: gitValue(['rev-parse', 'HEAD']),
      dirty: Boolean(gitValue(['status', '--porcelain'])),
      e2eDatabaseName,
      results,
      passed: !failed,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

if (failed) {
  console.error(`\nTallySync V10 RELEASE GATE FAILED.\nReport: ${reportPath}`);
  process.exitCode = 1;
} else {
  console.log('\nTallySync V10 RELEASE GATE PASSED.');
  console.log(`E2E database: ${e2eDatabaseName}`);
  console.log(`Report: ${reportPath}`);
}

function gitValue(args: string[]): string {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return '';
  }

  return String(result.stdout ?? '').trim();
}
