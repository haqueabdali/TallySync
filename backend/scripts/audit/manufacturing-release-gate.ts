import {
  existsSync,
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

interface ContractReport {
  controllers: unknown[];
  dtos: unknown[];
  entities: unknown[];
  services: unknown[];
  findings: Array<{
    severity: 'ERROR' | 'WARN' | 'INFO';
    area: string;
    detail: string;
  }>;
}

function main(): void {
  const reportPath =
    resolve(
      process.cwd(),
      'artifacts/manufacturing-contract-report.json',
    );

  if (!existsSync(reportPath)) {
    console.error(
      'Manufacturing gate FAILED: contract report is missing.',
    );
    process.exitCode = 1;
    return;
  }

  const report =
    JSON.parse(
      readFileSync(
        reportPath,
        'utf8',
      ),
    ) as ContractReport;

  const errors =
    report.findings.filter(
      (finding) =>
        finding.severity ===
        'ERROR',
    );

  console.log(
    'Manufacturing release gate',
  );

  console.log(
    `Routes: ${report.controllers.length}`,
  );

  console.log(
    `DTOs: ${report.dtos.length}`,
  );

  console.log(
    `Entities: ${report.entities.length}`,
  );

  console.log(
    `Services: ${report.services.length}`,
  );

  console.log(
    `Blocking contract errors: ${errors.length}`,
  );

  if (errors.length) {
    for (
      const error of errors
    ) {
      console.error(
        `- [${error.area}] ${error.detail}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  const e2e =
    resolve(
      process.cwd(),
      'test/manufacturing.e2e-spec.ts',
    );

  if (!existsSync(e2e)) {
    console.error(
      'Manufacturing gate FAILED: test/manufacturing.e2e-spec.ts is missing.',
    );
    process.exitCode = 1;
    return;
  }

  const content =
    readFileSync(
      e2e,
      'utf8',
    );

  const todoCount =
    (
      content.match(
        /\.todo\(/g,
      ) ?? []
    ).length;

  if (todoCount > 0) {
    console.error(
      `Manufacturing gate NOT GREEN: ${todoCount} test.todo case(s) remain.`,
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    'Manufacturing contract/E2E gate passed.',
  );
}

main();
