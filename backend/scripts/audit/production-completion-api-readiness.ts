import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

const candidates = [
  'src/production-orders/production-orders.controller.ts',
  'src/production-orders/production-order.controller.ts',
];

const controllerFile =
  candidates.find((candidate) =>
    existsSync(
      resolve(
        process.cwd(),
        candidate,
      ),
    ),
  );

const findings: Array<{
  severity:
    | 'ERROR'
    | 'WARN'
    | 'INFO';
  detail: string;
}> = [];

if (!controllerFile) {
  findings.push({
    severity:
      'ERROR',
    detail:
      'Production Orders controller file was not found.',
  });
} else {
  const content =
    readFileSync(
      resolve(
        process.cwd(),
        controllerFile,
      ),
      'utf8',
    );

  const hasCompleteRoute =
    /@(Post|Patch)\s*\(\s*['"`]:id\/complete['"`]\s*\)/.test(
      content,
    );

  /*
   * Do not require a specific injected property name.
   *
   * Valid examples:
   *   this.service.complete(...)
   *   this.productionOrdersService.complete(...)
   *   this.ordersService.complete(...)
   */
  const callsComplete =
    /this\s*\.\s*[A-Za-z_$][\w$]*\s*\.\s*complete\s*\(/.test(
      content,
    );

  const hasIdParam =
    /@Param\s*\(\s*['"`]id['"`]\s*,\s*ParseUUIDPipe\s*\)/.test(
      content,
    ) ||
    /@Param\s*\(\s*[\r\n\s]*['"`]id['"`][\s\S]{0,100}ParseUUIDPipe/.test(
      content,
    );

  const hasCompanyContext =
    /request\s*\.\s*user\s*\.\s*companyId/.test(
      content,
    );

  const hasUserContext =
    /request\s*\.\s*user\s*\.\s*id/.test(
      content,
    );

  if (!hasCompleteRoute) {
    findings.push({
      severity:
        'ERROR',
      detail:
        'Missing POST/PATCH :id/complete route.',
    });
  } else {
    findings.push({
      severity:
        'INFO',
      detail:
        'Production completion HTTP route detected.',
    });
  }

  if (!callsComplete) {
    findings.push({
      severity:
        'ERROR',
      detail:
        'Controller completion route does not call the injected ProductionOrdersService complete() method.',
    });
  } else {
    findings.push({
      severity:
        'INFO',
      detail:
        'Controller delegates production completion to the injected service complete() method.',
    });
  }

  if (!hasIdParam) {
    findings.push({
      severity:
        'WARN',
      detail:
        'No @Param("id", ParseUUIDPipe) signal detected in the completion route.',
    });
  }

  if (!hasCompanyContext) {
    findings.push({
      severity:
        'ERROR',
      detail:
        'Completion route does not pass request.user.companyId.',
    });
  }

  if (!hasUserContext) {
    findings.push({
      severity:
        'ERROR',
      detail:
        'Completion route does not pass request.user.id.',
    });
  }

  /*
   * The production-orders controller currently uses a class-level JwtAuthGuard.
   * Accept either class-level or method-level authentication.
   */
  const hasAuthGuard =
    /@UseGuards\s*\([\s\S]{0,120}(JwtAuthGuard|AuthGuard)/.test(
      content,
    );

  if (!hasAuthGuard) {
    findings.push({
      severity:
        'WARN',
      detail:
        'No obvious JWT/Auth guard detected. This may be acceptable only if authentication is global.',
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

const infos =
  findings.filter(
    (finding) =>
      finding.severity ===
      'INFO',
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
    'production-completion-api-readiness.json',
  ),
  JSON.stringify(
    findings,
    null,
    2,
  ),
  'utf8',
);

writeFileSync(
  resolve(
    outDir,
    'production-completion-api-readiness.md',
  ),
  [
    '# Production Completion API Readiness',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Summary: ERROR=${errors.length}, WARN=${warnings.length}, INFO=${infos.length}`,
    '',
    ...findings.map(
      (finding) =>
        `- **${finding.severity}** ${finding.detail}`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `Production completion API readiness: ERROR=${errors.length}, WARN=${warnings.length}, INFO=${infos.length}`,
);

for (const finding of findings) {
  console.log(
    `- ${finding.severity}: ${finding.detail}`,
  );
}

if (errors.length) {
  process.exitCode = 1;
}