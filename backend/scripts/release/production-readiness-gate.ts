import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  spawnSync,
} from 'node:child_process';

import {
  join,
  resolve,
} from 'node:path';

interface PackageJson {
  scripts?: Record<string, string>;
}

interface GateStep {
  id: string;
  label: string;
  command: string;
  args: string[];
  required: boolean;
  group:
    | 'build'
    | 'security'
    | 'schema'
    | 'unit'
    | 'commercial-e2e'
    | 'manufacturing'
    | 'release';
  env?: Record<string, string>;
}

interface StepResult {
  id: string;
  label: string;
  group: GateStep['group'];
  status:
    | 'passed'
    | 'failed'
    | 'skipped';
  required: boolean;
  exitCode: number | null;
  durationMs: number;
  command: string;
  outputTail: string;
}

interface ReadinessReport {
  generatedAt: string;
  database: string;
  dockerDeferred: boolean;
  steps: StepResult[];
  groups: Record<
    string,
    {
      passed: number;
      failed: number;
      skipped: number;
      score: number;
    }
  >;
  overall: {
    requiredPassed: number;
    requiredFailed: number;
    optionalPassed: number;
    optionalFailed: number;
    score: number;
    productionReady: boolean;
  };
}

const cwd = process.cwd();

const packageJsonPath =
  resolve(cwd, 'package.json');

if (!existsSync(packageJsonPath)) {
  throw new Error(
    'package.json not found.',
  );
}

const packageJson =
  JSON.parse(
    readFileSync(
      packageJsonPath,
      'utf8',
    ),
  ) as PackageJson;

const scripts =
  packageJson.scripts ?? {};

const database =
  process.env.E2E_DATABASE_NAME ??
  'tallysync_e2e_test';

function hasScript(
  name: string,
): boolean {
  return Boolean(
    scripts[name],
  );
}

function npmStep(
  id: string,
  label: string,
  script: string,
  group: GateStep['group'],
  required = true,
  extraArgs: string[] = [],
): GateStep {
  return {
    id,
    label,
    command:
      process.platform === 'win32'
        ? 'npm.cmd'
        : 'npm',
    args: [
      'run',
      script,
      ...extraArgs,
    ],
    group,
    required,
    env: {
      E2E_DATABASE_NAME:
        database,
      NODE_ENV:
        process.env.NODE_ENV ??
        'test',
    },
  };
}

function rawNpmStep(
  id: string,
  label: string,
  args: string[],
  group: GateStep['group'],
  required = true,
): GateStep {
  return {
    id,
    label,
    command:
      process.platform === 'win32'
        ? 'npm.cmd'
        : 'npm',
    args,
    group,
    required,
    env: {
      E2E_DATABASE_NAME:
        database,
      NODE_ENV:
        process.env.NODE_ENV ??
        'test',
    },
  };
}

const steps: GateStep[] = [
  rawNpmStep(
    'build',
    'TypeScript / Nest build',
    ['run', 'build'],
    'build',
    true,
  ),

  ...(hasScript(
    'audit:security',
  )
    ? [
        npmStep(
          'security',
          'Security audit',
          'audit:security',
          'security',
          true,
        ),
      ]
    : []),

  ...(hasScript(
    'audit:entity-schema',
  )
    ? [
        npmStep(
          'entity-schema',
          'Entity ↔ DB schema audit',
          'audit:entity-schema',
          'schema',
          true,
        ),
      ]
    : []),

  ...(hasScript(
    'audit:accounting-idempotency',
  )
    ? [
        npmStep(
          'accounting-idempotency',
          'Accounting source idempotency',
          'audit:accounting-idempotency',
          'schema',
          true,
        ),
      ]
    : []),

  ...(hasScript(
    'audit:manufacturing:fixes',
  )
    ? [
        npmStep(
          'manufacturing-fixes',
          'Manufacturing fix analyzer',
          'audit:manufacturing:fixes',
          'manufacturing',
          true,
        ),
      ]
    : []),

  ...(hasScript(
    'audit:manufacturing:contract',
  )
    ? [
        npmStep(
          'manufacturing-contract',
          'Manufacturing contract report',
          'audit:manufacturing:contract',
          'manufacturing',
          true,
        ),
      ]
    : []),

  rawNpmStep(
    'unit-tests',
    'Full unit test suite',
    [
      'test',
      '--',
      '--runInBand',
    ],
    'unit',
    true,
  ),

  ...(hasScript(
    'test:e2e:business',
  )
    ? [
        npmStep(
          'sales-to-cash',
          'Sales-to-Cash E2E',
          'test:e2e:business',
          'commercial-e2e',
          true,
        ),
      ]
    : []),

  ...(hasScript(
    'test:e2e:procure',
  )
    ? [
        npmStep(
          'procure-to-pay',
          'Procure-to-Pay E2E',
          'test:e2e:procure',
          'commercial-e2e',
          true,
        ),
      ]
    : []),

  ...(hasScript(
    'test:e2e:manufacturing',
  )
    ? [
        npmStep(
          'manufacturing-e2e',
          'Manufacturing E2E',
          'test:e2e:manufacturing',
          'manufacturing',
          false,
        ),
      ]
    : []),

  ...(hasScript(
    'audit:manufacturing:release',
  )
    ? [
        npmStep(
          'manufacturing-release',
          'Manufacturing release gate',
          'audit:manufacturing:release',
          'manufacturing',
          false,
        ),
      ]
    : []),
];

function tail(
  value: string,
  maxLines = 30,
): string {
  const lines =
    value
      .split(/\r?\n/)
      .filter(Boolean);

  return lines
    .slice(
      Math.max(
        0,
        lines.length -
          maxLines,
      ),
    )
    .join('\n');
}

function runStep(
  step: GateStep,
): StepResult {
  const started =
    Date.now();

  const result =
    spawnSync(
      step.command,
      step.args,
      {
        cwd,
        env: {
          ...process.env,
          ...step.env,
        },
        encoding:
          'utf8',
        shell: false,
        windowsHide:
          true,
      },
    );

  const durationMs =
    Date.now() -
    started;

  const output =
    [
      result.stdout ?? '',
      result.stderr ?? '',
    ]
      .filter(Boolean)
      .join('\n');

  if (result.error) {
    return {
      id: step.id,
      label:
        step.label,
      group:
        step.group,
      status:
        'failed',
      required:
        step.required,
      exitCode:
        result.status,
      durationMs,
      command:
        `${step.command} ${step.args.join(' ')}`,
      outputTail:
        tail(
          `${result.error.message}\n${output}`,
        ),
    };
  }

  return {
    id: step.id,
    label:
      step.label,
    group:
      step.group,
    status:
      result.status === 0
        ? 'passed'
        : 'failed',
    required:
      step.required,
    exitCode:
      result.status,
    durationMs,
    command:
      `${step.command} ${step.args.join(' ')}`,
    outputTail:
      tail(output),
  };
}

const results:
  StepResult[] = [];

for (const step of steps) {
  console.log(
    `\n==> ${step.label}`,
  );

  const result =
    runStep(step);

  results.push(result);

  console.log(
    `${result.status.toUpperCase()} (${(
      result.durationMs /
      1000
    ).toFixed(1)}s)`,
  );

  if (
    result.status ===
      'failed' &&
    result.required
  ) {
    console.log(
      'Required gate failed; remaining independent gates will still run so the report shows the complete state.',
    );
  }
}

const groupNames =
  [
    ...new Set(
      results.map(
        (result) =>
          result.group,
      ),
    ),
  ];

const groups:
  ReadinessReport['groups'] =
  {};

for (
  const group of
    groupNames
) {
  const groupResults =
    results.filter(
      (result) =>
        result.group ===
        group,
    );

  const passed =
    groupResults.filter(
      (result) =>
        result.status ===
        'passed',
    ).length;

  const failed =
    groupResults.filter(
      (result) =>
        result.status ===
        'failed',
    ).length;

  const skipped =
    groupResults.filter(
      (result) =>
        result.status ===
        'skipped',
    ).length;

  groups[group] = {
    passed,
    failed,
    skipped,
    score:
      groupResults.length ===
      0
        ? 0
        : Math.round(
            (passed /
              groupResults.length) *
              100,
          ),
  };
}

const required =
  results.filter(
    (result) =>
      result.required,
  );

const optional =
  results.filter(
    (result) =>
      !result.required,
  );

const requiredPassed =
  required.filter(
    (result) =>
      result.status ===
      'passed',
  ).length;

const requiredFailed =
  required.filter(
    (result) =>
      result.status ===
      'failed',
  ).length;

const optionalPassed =
  optional.filter(
    (result) =>
      result.status ===
      'passed',
  ).length;

const optionalFailed =
  optional.filter(
    (result) =>
      result.status ===
      'failed',
  ).length;

const score =
  results.length
    ? Math.round(
        (
          results.filter(
            (result) =>
              result.status ===
              'passed',
          ).length /
          results.length
        ) *
          100,
      )
    : 0;

const report:
  ReadinessReport = {
  generatedAt:
    new Date().toISOString(),
  database,
  dockerDeferred: true,
  steps: results,
  groups,
  overall: {
    requiredPassed,
    requiredFailed,
    optionalPassed,
    optionalFailed,
    score,
    productionReady:
      requiredFailed === 0 &&
      optionalFailed === 0,
  },
};

const artifacts =
  resolve(
    cwd,
    'artifacts',
  );

mkdirSync(
  artifacts,
  {
    recursive: true,
  },
);

writeFileSync(
  join(
    artifacts,
    'production-readiness.json',
  ),
  JSON.stringify(
    report,
    null,
    2,
  ),
  'utf8',
);

const icon = (
  status:
    StepResult['status'],
): string =>
  status === 'passed'
    ? '✅'
    : status === 'failed'
      ? '❌'
      : '⏭';

const markdown: string[] = [
  '# TallySync Production Readiness',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `E2E database: \`${database}\``,
  '',
  `Overall gate score: **${score}%**`,
  '',
  `Production-ready by current gate: **${report.overall.productionReady ? 'YES' : 'NO'}**`,
  '',
  '> Docker/container validation remains intentionally deferred because the local Windows virtualization issue is external to the application code.',
  '',
  '## Gate Results',
  '',
  '| Status | Gate | Group | Required |',
  '|---|---|---|---|',
];

for (const result of results) {
  markdown.push(
    `| ${icon(result.status)} | ${result.label} | ${result.group} | ${result.required ? 'yes' : 'no'} |`,
  );
}

markdown.push(
  '',
  '## Group Scores',
  '',
  '| Group | Score | Passed | Failed |',
  '|---|---:|---:|---:|',
);

for (
  const [
    group,
    value,
  ] of Object.entries(
    groups,
  )
) {
  markdown.push(
    `| ${group} | ${value.score}% | ${value.passed} | ${value.failed} |`,
  );
}

const failed =
  results.filter(
    (result) =>
      result.status ===
      'failed',
  );

if (failed.length) {
  markdown.push(
    '',
    '## Failures',
    '',
  );

  for (const failure of failed) {
    markdown.push(
      `### ${failure.label}`,
      '',
      `Command: \`${failure.command}\``,
      '',
      '```text',
      failure.outputTail ||
        '(no output)',
      '```',
      '',
    );
  }
}

markdown.push(
  '',
  '## Success Definition',
  '',
  'The backend moves to **commercial production candidate** when all required gates pass.',
  '',
  'Manufacturing becomes **Operational GREEN** only when both the manufacturing E2E and manufacturing release gate also pass.',
);

writeFileSync(
  join(
    artifacts,
    'production-readiness.md',
  ),
  markdown.join('\n'),
  'utf8',
);

console.log(
  '\nReadiness reports written:',
);

console.log(
  '- artifacts/production-readiness.json',
);

console.log(
  '- artifacts/production-readiness.md',
);

if (
  !report.overall
    .productionReady
) {
  process.exitCode = 1;
}
