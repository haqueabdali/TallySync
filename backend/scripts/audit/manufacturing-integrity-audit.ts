import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  join,
  relative,
  resolve,
} from 'node:path';

type Severity = 'ERROR' | 'WARN' | 'INFO';

interface Finding {
  severity: Severity;
  file: string;
  message: string;
}

const ROOTS = [
  'src/bill-of-materials',
  'src/production-orders',
  'src/material-consumption',
  'src/manufacturing-mrp',
  'src/production-variance',
  'src/costing-variance',
];

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...walk(path));
    } else if (name.endsWith('.ts')) {
      files.push(path);
    }
  }

  return files;
}

function display(path: string): string {
  return relative(process.cwd(), path).replace(/\\/g, '/');
}

function main(): void {
  const findings: Finding[] = [];

  const sourceFiles = ROOTS.flatMap((root) =>
    walk(resolve(process.cwd(), root)),
  );

  if (!sourceFiles.length) {
    console.error(
      'Manufacturing integrity audit FAILED: no manufacturing TypeScript files were found.',
    );
    process.exitCode = 1;
    return;
  }

  const serviceFiles =
    sourceFiles.filter(
      (file) =>
        file.endsWith('.service.ts') &&
        !file.endsWith('.spec.ts'),
    );

  const controllerFiles =
    sourceFiles.filter(
      (file) =>
        file.endsWith('.controller.ts'),
    );

  let currentStockUsage = 0;
  let transactionUsage = 0;
  let lockUsage = 0;
  let completionSignal = 0;
  let consumptionSignal = 0;

  for (const file of serviceFiles) {
    const content =
      readFileSync(file, 'utf8');

    const fileName = display(file);

    if (
      /\b(stockQty|currentQty|quantityOnHand|onHand)\b/.test(
        content,
      )
    ) {
      findings.push({
        severity: 'ERROR',
        file: fileName,
        message:
          'Legacy/parallel stock property detected. Manufacturing must use ItemEntity.currentStock.',
      });
    }

    if (/\bcurrentStock\b/.test(content)) {
      currentStockUsage += 1;
    }

    if (
      /dataSource\.transaction|manager\.transaction|\.transaction\(/.test(
        content,
      )
    ) {
      transactionUsage += 1;
    }

    if (
      /pessimistic_write|setLock\(\s*['"]pessimistic_write/.test(
        content,
      )
    ) {
      lockUsage += 1;
    }

    if (
      /complete|completed|finished.?goods|finish/i.test(
        content,
      )
    ) {
      completionSignal += 1;
    }

    if (
      /consum|issue.?material/i.test(
        content,
      )
    ) {
      consumptionSignal += 1;
    }

    const mutatesStock =
      /currentStock\s*=|current_stock\s*=|currentStock\s*[+-]=/.test(
        content,
      );

    if (
      mutatesStock &&
      !/transaction\(/.test(content)
    ) {
      findings.push({
        severity: 'ERROR',
        file: fileName,
        message:
          'Stock mutation detected outside an obvious transaction boundary.',
      });
    }

    if (
      mutatesStock &&
      !/pessimistic_write|setLock|current_stock\s*>?=|affected/.test(
        content,
      )
    ) {
      findings.push({
        severity: 'WARN',
        file: fileName,
        message:
          'Stock mutation found without an obvious row lock or atomic guarded update. Review for concurrent consumption/completion races.',
      });
    }

    if (
      /status\s*=.*Completed|status\s*=.*COMPLETED/i.test(
        content,
      ) &&
      !/already|status\s*===.*Completed|status\s*!==.*Completed|ensure/i.test(
        content,
      )
    ) {
      findings.push({
        severity: 'WARN',
        file: fileName,
        message:
          'Completion status mutation detected without an obvious idempotency/status guard.',
      });
    }
  }

  for (const file of controllerFiles) {
    const content =
      readFileSync(file, 'utf8');

    const fileName = display(file);

    const mutationRoutes =
      /@(Post|Patch|Put|Delete)\(/.test(
        content,
      );

    if (
      mutationRoutes &&
      !(
        content.includes('JwtAuthGuard') &&
        content.includes('@UseGuards')
      )
    ) {
      findings.push({
        severity: 'ERROR',
        file: fileName,
        message:
          'Mutation routes detected without an obvious JwtAuthGuard.',
      });
    }
  }

  findings.push({
    severity: 'INFO',
    file: 'manufacturing',
    message:
      `Scanned ${sourceFiles.length} TS files / ${serviceFiles.length} services / ${controllerFiles.length} controllers.`,
  });

  findings.push({
    severity: 'INFO',
    file: 'manufacturing',
    message:
      `currentStock used by ${currentStockUsage} service(s); transaction API detected in ${transactionUsage}; row-lock signal in ${lockUsage}.`,
  });

  findings.push({
    severity: 'INFO',
    file: 'manufacturing',
    message:
      `Completion signals found in ${completionSignal} service(s); consumption signals in ${consumptionSignal}.`,
  });

  const errors =
    findings.filter(
      (finding) =>
        finding.severity === 'ERROR',
    );

  const warnings =
    findings.filter(
      (finding) =>
        finding.severity === 'WARN',
    );

  for (
    const info of findings.filter(
      (finding) =>
        finding.severity === 'INFO',
    )
  ) {
    console.log(
      `[INFO] ${info.message}`,
    );
  }

  if (warnings.length) {
    console.log(
      `\nWarnings (${warnings.length}):`,
    );

    for (const finding of warnings) {
      console.log(
        `- [${finding.file}] ${finding.message}`,
      );
    }
  }

  if (errors.length) {
    console.error(
      `\nManufacturing integrity audit FAILED with ${errors.length} blocking error(s):`,
    );

    for (const finding of errors) {
      console.error(
        `- [${finding.file}] ${finding.message}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    '\nManufacturing integrity audit passed: no blocking static integrity defects found.',
  );
}

main();
