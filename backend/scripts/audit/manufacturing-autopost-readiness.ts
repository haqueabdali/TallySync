import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

interface Target {
  file: string;
  label: string;
  methodSignals: RegExp[];
  accountingMethod: string;
  autoPostSetting: string;
  postedSignals: RegExp[];
}

interface Finding {
  severity:
    | 'ERROR'
    | 'WARN'
    | 'INFO';
  file: string;
  label: string;
  detail: string;
}

const targets: Target[] = [
  {
    file:
      'src/material-consumption/material-consumption.service.ts',
    label:
      'Material Consumption',
    methodSignals: [
      /\bpost\s*\(/i,
      /\bissue\s*\(/i,
      /\bconsume\s*\(/i,
      /\bcomplete\s*\(/i,
    ],
    accountingMethod:
      'postMaterialConsumption',
    autoPostSetting:
      'autoPostMaterialConsumption',
    postedSignals: [
      /Posted/i,
      /POSTED/i,
      /posted/i,
    ],
  },
  {
    file:
      'src/production-orders/production-orders.service.ts',
    label:
      'Production Completion',
    methodSignals: [
      /\bcomplete\s*\(/i,
      /\bfinish\s*\(/i,
      /\breceiveFinished/i,
    ],
    accountingMethod:
      'postProductionCompletion',
    autoPostSetting:
      'autoPostProductionCompletion',
    postedSignals: [
      /Completed/i,
      /COMPLETED/i,
      /completed/i,
    ],
  },
  {
    file:
      'src/production-variance/production-variance.service.ts',
    label:
      'Production Variance',
    methodSignals: [
      /\bpost\s*\(/i,
      /\bcalculate\s*\(/i,
      /\brecalculate\s*\(/i,
      /\bfinalize\s*\(/i,
    ],
    accountingMethod:
      'postProductionVariance',
    autoPostSetting:
      'autoPostProductionVariance',
    postedSignals: [
      /Posted/i,
      /POSTED/i,
      /Finalized/i,
      /FINALIZED/i,
    ],
  },
];

function firstMatchingMethod(
  content: string,
  signals: RegExp[],
): string | null {
  for (const signal of signals) {
    const match =
      content.match(signal);

    if (match) {
      return match[0];
    }
  }

  return null;
}

function main(): void {
  const findings:
    Finding[] = [];

  for (const target of targets) {
    const path =
      resolve(
        process.cwd(),
        target.file,
      );

    if (!existsSync(path)) {
      findings.push({
        severity: 'ERROR',
        file: target.file,
        label: target.label,
        detail:
          'Service file not found.',
      });
      continue;
    }

    const content =
      readFileSync(
        path,
        'utf8',
      );

    const lifecycleMethod =
      firstMatchingMethod(
        content,
        target.methodSignals,
      );

    if (!lifecycleMethod) {
      findings.push({
        severity: 'WARN',
        file: target.file,
        label: target.label,
        detail:
          'No obvious posting/completion lifecycle method detected.',
      });
    } else {
      findings.push({
        severity: 'INFO',
        file: target.file,
        label: target.label,
        detail:
          `Lifecycle signal detected: ${lifecycleMethod}`,
      });
    }

    if (
      !content.includes(
        'AccountingEngineService',
      )
    ) {
      findings.push({
        severity: 'ERROR',
        file: target.file,
        label: target.label,
        detail:
          'AccountingEngineService is not injected/imported.',
      });
    }

    if (
      !content.includes(
        target.accountingMethod,
      )
    ) {
      findings.push({
        severity: 'ERROR',
        file: target.file,
        label: target.label,
        detail:
          `No ${target.accountingMethod}(...) call detected.`,
      });
    }

    if (
      !content.includes(
        target.autoPostSetting,
      )
    ) {
      findings.push({
        severity: 'ERROR',
        file: target.file,
        label: target.label,
        detail:
          `No ${target.autoPostSetting} settings check detected.`,
      });
    }

    const hasTransaction =
      /dataSource\.transaction\s*\(/.test(
        content,
      );

    if (!hasTransaction) {
      findings.push({
        severity: 'WARN',
        file: target.file,
        label: target.label,
        detail:
          'No DataSource.transaction(...) signal detected.',
      });
    }

    const accountingCallIndex =
      content.indexOf(
        target.accountingMethod,
      );

    const transactionIndex =
      content.indexOf(
        'dataSource.transaction',
      );

    if (
      accountingCallIndex >= 0 &&
      transactionIndex >= 0 &&
      accountingCallIndex >
        transactionIndex
    ) {
      const afterTransaction =
        content.slice(
          transactionIndex,
          accountingCallIndex,
        );

      const likelyClosed =
        /\}\s*\)\s*;/.test(
          afterTransaction,
        );

      if (!likelyClosed) {
        findings.push({
          severity: 'WARN',
          file: target.file,
          label: target.label,
          detail:
            'Accounting call may still be inside the business transaction. Review manually.',
        });
      }
    }

    const hasRetrySignal =
      target.postedSignals.some(
        (signal) =>
          signal.test(content),
      ) &&
      content.includes(
        target.accountingMethod,
      );

    if (!hasRetrySignal) {
      findings.push({
        severity: 'WARN',
        file: target.file,
        label: target.label,
        detail:
          'No obvious already-posted/completed retry path was detected.',
      });
    }
  }

  const errors =
    findings.filter(
      (finding) =>
        finding.severity ===
        'ERROR',
    );

  const warnings =
    findings.filter(
      (finding) =>
        finding.severity ===
        'WARN',
    );

  const outDir =
    resolve(
      process.cwd(),
      'artifacts',
    );

  mkdirSync(
    outDir,
    {
      recursive: true,
    },
  );

  writeFileSync(
    resolve(
      outDir,
      'manufacturing-autopost-readiness.json',
    ),
    JSON.stringify(
      findings,
      null,
      2,
    ),
    'utf8',
  );

  const md = [
    '# Manufacturing Auto-post Readiness',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...findings.flatMap(
      (finding) => [
        `## ${finding.severity} — ${finding.label}`,
        '',
        `File: \`${finding.file}\``,
        '',
        finding.detail,
        '',
      ],
    ),
  ];

  writeFileSync(
    resolve(
      outDir,
      'manufacturing-autopost-readiness.md',
    ),
    md.join('\n'),
    'utf8',
  );

  console.log(
    `Manufacturing auto-post readiness: ERROR=${errors.length}, WARN=${warnings.length}, TOTAL=${findings.length}`,
  );

  console.log(
    '- artifacts/manufacturing-autopost-readiness.json',
  );

  console.log(
    '- artifacts/manufacturing-autopost-readiness.md',
  );

  if (errors.length) {
    process.exitCode = 1;
  }
}

main();
