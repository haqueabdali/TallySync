import { spawnSync } from 'child_process';
import { resolve } from 'path';

interface AuditCommand {
  name: string;
  script: string;
}

const tsNodeBin = require.resolve('ts-node/dist/bin.js');

const commands: AuditCommand[] = [
  {
    name: 'Controller prefix audit',
    script: 'scripts/audit/controller-prefix-audit.ts',
  },
  {
    name: 'Controller security audit',
    script: 'scripts/audit/controller-security-audit.ts',
  },
  {
    name: 'Secret scan',
    script: 'scripts/audit/secret-scan.ts',
  },
  {
    name: 'Circular dependency audit',
    script: 'scripts/audit/circular-dependency-audit.ts',
  },
];

let failed = false;

for (const command of commands) {
  console.log(`\n==> ${command.name}`);

  const result = spawnSync(
    process.execPath,
    [
      tsNodeBin,
      '-r',
      'tsconfig-paths/register',
      resolve(command.script),
    ],
    {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    },
  );

  if (result.error) {
    console.error(
      `${command.name} could not run: ${result.error.message}`,
    );
    failed = true;
    continue;
  }

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error('\nSecurity/dependency audit FAILED.');
  process.exitCode = 1;
} else {
  console.log('\nSecurity/dependency audit passed.');
}
