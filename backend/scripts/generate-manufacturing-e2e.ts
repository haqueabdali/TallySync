import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  dirname,
  resolve,
} from 'node:path';

interface Route {
  file: string;
  controller: string;
  method: string;
  path: string;
  handler: string;
  guards: string[];
  roles: string[];
  parameters: Array<{
    name: string;
    type: string;
    decorators: string[];
  }>;
}

interface Dto {
  file: string;
  className: string;
  properties: Array<{
    name: string;
    type: string;
    optional: boolean;
    decorators: string[];
  }>;
}

interface ContractReport {
  controllers: Route[];
  dtos: Dto[];
  findings: Array<{
    severity: 'ERROR' | 'WARN' | 'INFO';
    area: string;
    detail: string;
  }>;
}

interface Candidate {
  label: string;
  route: Route | null;
}

function fullPath(
  route: Route,
): string {
  return (
    '/' +
    [
      route.controller,
      route.path,
    ]
      .filter(Boolean)
      .join('/')
      .replace(
        /\/+/g,
        '/',
      )
  );
}

function scoreRoute(
  route: Route,
  terms: string[],
  methods?: string[],
): number {
  if (
    methods &&
    !methods.includes(
      route.method,
    )
  ) {
    return -1;
  }

  const haystack =
    `${route.controller} ${route.path} ${route.handler} ${route.parameters
      .map((parameter) => parameter.type)
      .join(' ')}`
      .toLowerCase();

  let score = 0;

  for (const term of terms) {
    if (
      haystack.includes(
        term.toLowerCase(),
      )
    ) {
      score += 3;
    }
  }

  if (
    route.guards.some(
      (guard) =>
        guard.includes(
          'JwtAuthGuard',
        ),
    )
  ) {
    score += 1;
  }

  return score;
}

function best(
  routes: Route[],
  terms: string[],
  methods?: string[],
): Route | null {
  return (
    routes
      .map((route) => ({
        route,
        score: scoreRoute(
          route,
          terms,
          methods,
        ),
      }))
      .filter(
        (entry) =>
          entry.score > 0,
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      )[0]?.route ??
    null
  );
}

function dtoNames(
  route: Route | null,
): string[] {
  if (!route) {
    return [];
  }

  return route.parameters
    .map(
      (parameter) =>
        parameter.type,
    )
    .filter(
      (type) =>
        /Dto\b/.test(type),
    );
}

function dtoComment(
  report: ContractReport,
  route: Route | null,
): string {
  const names =
    dtoNames(route);

  if (!names.length) {
    return '// No DTO type detected from controller parameters.';
  }

  const lines: string[] = [];

  for (const name of names) {
    const dto =
      report.dtos.find(
        (candidate) =>
          candidate.className ===
          name,
      );

    if (!dto) {
      lines.push(
        `// ${name}: DTO class was referenced by controller but not parsed.`,
      );
      continue;
    }

    lines.push(
      `// ${name}:`,
    );

    for (
      const property of
        dto.properties
    ) {
      lines.push(
        `//   ${property.name}${property.optional ? '?' : ''}: ${property.type}`,
      );
    }
  }

  return lines.join('\n');
}

function routeLiteral(
  route: Route | null,
): string {
  if (!route) {
    return 'null';
  }

  return JSON.stringify({
    method: route.method,
    path: fullPath(route),
    handler: route.handler,
  });
}

function main(): void {
  const input =
    resolve(
      process.cwd(),
      'artifacts/manufacturing-contract-report.json',
    );

  if (!existsSync(input)) {
    throw new Error(
      'Manufacturing contract report not found. Run npm run audit:manufacturing:contract first.',
    );
  }

  const report =
    JSON.parse(
      readFileSync(
        input,
        'utf8',
      ),
    ) as ContractReport;

  const blocking =
    report.findings.filter(
      (finding) =>
        finding.severity ===
        'ERROR',
    );

  if (blocking.length) {
    throw new Error(
      `Refusing to generate manufacturing E2E while the contract report contains ${blocking.length} blocking error(s).`,
    );
  }

  const routes =
    report.controllers;

  const candidates:
    Candidate[] = [
      {
        label:
          'createBom',
        route: best(
          routes,
          [
            'bill',
            'material',
            'create',
          ],
          ['POST'],
        ),
      },
      {
        label:
          'createProductionOrder',
        route: best(
          routes,
          [
            'production',
            'order',
            'create',
          ],
          ['POST'],
        ),
      },
      {
        label:
          'releaseProductionOrder',
        route: best(
          routes,
          [
            'production',
            'release',
          ],
          [
            'POST',
            'PATCH',
          ],
        ),
      },
      {
        label:
          'startProductionOrder',
        route: best(
          routes,
          [
            'production',
            'start',
          ],
          [
            'POST',
            'PATCH',
          ],
        ),
      },
      {
        label:
          'completeProductionOrder',
        route: best(
          routes,
          [
            'production',
            'complete',
          ],
          [
            'POST',
            'PATCH',
          ],
        ),
      },
      {
        label:
          'createMaterialConsumption',
        route: best(
          routes,
          [
            'material',
            'consum',
          ],
          ['POST'],
        ),
      },
      {
        label:
          'postMaterialConsumption',
        route: best(
          routes,
          [
            'material',
            'consum',
            'post',
          ],
          [
            'POST',
            'PATCH',
          ],
        ),
      },
      {
        label:
          'runMrp',
        route: best(
          routes,
          [
            'mrp',
          ],
          [
            'POST',
            'GET',
          ],
        ),
      },
      {
        label:
          'productionVariance',
        route: best(
          routes,
          [
            'production',
            'variance',
          ],
          [
            'POST',
            'GET',
          ],
        ),
      },
    ];

  const routeBlock =
    candidates
      .map(
        (candidate) =>
          `  ${candidate.label}: ${routeLiteral(candidate.route)},`,
      )
      .join('\n');

  const contractNotes =
    candidates
      .map(
        (candidate) => {
          const route =
            candidate.route;

          return [
            `// ${candidate.label}`,
            route
              ? `// ${route.method} ${fullPath(route)} -> ${route.handler}`
              : '// ROUTE NOT DETECTED',
            dtoComment(
              report,
              route,
            ),
            '',
          ].join('\n');
        },
      )
      .join('\n');

  const detectedCount =
    candidates.filter(
      (candidate) =>
        candidate.route,
    ).length;

  const missing =
    candidates
      .filter(
        (candidate) =>
          !candidate.route,
      )
      .map(
        (candidate) =>
          candidate.label,
      );

  const output = `
/**
 * AUTO-GENERATED from:
 * artifacts/manufacturing-contract-report.json
 *
 * Detected ${detectedCount}/${candidates.length} manufacturing lifecycle routes.
 *
 * Missing detections:
 * ${missing.length ? missing.join(', ') : 'none'}
 *
 * This file intentionally keeps business payload construction explicit.
 * Route names and DTO fields below come from the CURRENT source contract.
 */

import {
  type INestApplication,
} from '@nestjs/common';

import request from 'supertest';

const routes = {
${routeBlock}
} as const;

${contractNotes}

describe(
  'Manufacturing Order-to-Completion (e2e)',
  () => {
    let app:
      INestApplication;

    let token: string;
    let api = '/api/v1';

    /*
     * Reuse the same dedicated E2E bootstrap pattern already used by
     * sales-to-cash.e2e-spec.ts and procure-to-pay.e2e-spec.ts.
     *
     * Set:
     *   app
     *   token
     *   company/admin fixtures
     * before these tests execute.
     */

    it.todo(
      'creates raw-material and finished-good items with currentStock-backed inventory',
    );

    it.todo(
      'creates a BOM using the detected BOM route and current DTO contract',
    );

    it.todo(
      'creates/releases a production order and expands BOM demand for planned quantity',
    );

    it.todo(
      'runs MRP twice without changing raw-material currentStock',
    );

    it.todo(
      'starts the production order through a valid lifecycle transition',
    );

    it.todo(
      'consumes materials atomically and decreases currentStock exactly once',
    );

    it.todo(
      'rolls back every component mutation when one required component is insufficient',
    );

    it.todo(
      'completes production and increases finished-good currentStock exactly once',
    );

    it.todo(
      'retries completion without duplicating finished-goods stock',
    );

    it.todo(
      'rejects cross-company BOM/component/production references',
    );

    it.todo(
      'calculates production variance deterministically',
    );

    it.todo(
      'reconciles actual production cost against the completed quantity',
    );
  },
);
`;

  const outputPath =
    resolve(
      process.cwd(),
      'test/manufacturing.e2e-spec.ts',
    );

  mkdirSync(
    dirname(
      outputPath,
    ),
    {
      recursive: true,
    },
  );

  writeFileSync(
    outputPath,
    output.trimStart(),
    'utf8',
  );

  console.log(
    'Manufacturing E2E scaffold generated.',
  );

  console.log(
    `Detected routes: ${detectedCount}/${candidates.length}`,
  );

  if (missing.length) {
    console.log(
      `Routes needing manual mapping: ${missing.join(', ')}`,
    );
  }

  console.log(
    'Output: test/manufacturing.e2e-spec.ts',
  );
}

main();
