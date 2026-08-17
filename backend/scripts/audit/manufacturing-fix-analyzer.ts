import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import {
  join,
  relative,
  resolve,
} from 'node:path';

import * as ts from 'typescript';

interface Finding {
  severity: 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'INFO';
  file: string;
  line: number;
  method: string | null;
  category:
    | 'stock-contract'
    | 'transaction'
    | 'concurrency'
    | 'idempotency'
    | 'company-scope'
    | 'mrp-mutation'
    | 'completion'
    | 'security';
  detail: string;
  recommendation: string;
}

const ROOTS = [
  'src/bill-of-materials',
  'src/production-orders',
  'src/material-consumption',
  'src/manufacturing-mrp',
  'src/production-variance',
  'src/costing-variance',
  'src/production-scheduling',
  'src/capacity-planning',
  'src/quality-management',
];

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const output: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      output.push(...walk(path));
      continue;
    }

    if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts')
    ) {
      output.push(path);
    }
  }

  return output;
}

function lineOf(
  source: ts.SourceFile,
  node: ts.Node,
): number {
  return (
    source.getLineAndCharacterOfPosition(
      node.getStart(source),
    ).line + 1
  );
}

function rel(path: string): string {
  return relative(
    process.cwd(),
    path,
  ).replace(/\\/g, '/');
}

function methodName(
  node: ts.Node,
): string | null {
  let current:
    | ts.Node
    | undefined = node;

  while (current) {
    if (
      ts.isMethodDeclaration(current)
    ) {
      return (
        current.name?.getText() ??
        null
      );
    }

    current = current.parent;
  }

  return null;
}

function containingMethod(
  node: ts.Node,
): ts.MethodDeclaration | null {
  let current:
    | ts.Node
    | undefined = node;

  while (current) {
    if (
      ts.isMethodDeclaration(current)
    ) {
      return current;
    }

    current = current.parent;
  }

  return null;
}

function containsTransaction(
  method: ts.MethodDeclaration,
): boolean {
  const text =
    method.getText();

  return (
    /dataSource\.transaction\s*\(/.test(
      text,
    ) ||
    /manager\.transaction\s*\(/.test(
      text,
    ) ||
    /\.transaction\s*\(/.test(
      text,
    )
  );
}

function containsLock(
  method: ts.MethodDeclaration,
): boolean {
  const text =
    method.getText();

  return (
    /pessimistic_write/.test(text) ||
    /\.setLock\s*\(/.test(text) ||
    /current_stock\s*>?=/.test(text) ||
    /\baffected\b/.test(text)
  );
}

function hasCompanyScope(
  method: ts.MethodDeclaration,
): boolean {
  const text =
    method.getText();

  return (
    /\bcompanyId\b/.test(text) &&
    (
      /where\s*:\s*\{[\s\S]*companyId/.test(
        text,
      ) ||
      /company_id\s*=/.test(text) ||
      /\.andWhere\([\s\S]*company/.test(
        text,
      ) ||
      /\.where\([\s\S]*company/.test(
        text,
      )
    )
  );
}

function isCompletionMethod(
  method: ts.MethodDeclaration,
): boolean {
  return /complete|finish|receipt/i.test(
    method.name?.getText() ?? '',
  );
}

function isConsumptionMethod(
  method: ts.MethodDeclaration,
): boolean {
  return /consum|issue/i.test(
    method.name?.getText() ?? '',
  );
}

function isMrpMethod(
  file: string,
  method: ts.MethodDeclaration,
): boolean {
  return (
    file.includes(
      'manufacturing-mrp',
    ) ||
    /mrp|plan|requirement/i.test(
      method.name?.getText() ?? '',
    )
  );
}

function recommendationForStock(): string {
  return [
    'Use ItemEntity.currentStock as the single stock truth.',
    'Do not add stockQty/currentQty/onHand aliases.',
    'Convert numeric values with Number(...) only at calculation boundaries.',
  ].join(' ');
}

function recommendationForTransaction(): string {
  return [
    'Wrap the complete business mutation in DataSource.transaction(async manager => ...).',
    'Use manager.getRepository(...) for every write participating in the operation.',
    'Do not mix injected repositories with manager repositories inside the transaction.',
  ].join(' ');
}

function recommendationForConcurrency(): string {
  return [
    'Reload the stock row under pessimistic_write inside the transaction,',
    'or use an atomic guarded UPDATE ... WHERE current_stock >= :qty and require affected === 1.',
  ].join(' ');
}

function recommendationForCompletion(): string {
  return [
    'Make completion exactly-once:',
    'if already Completed, return the existing order without adding finished stock again.',
    'Lock/reload the production order before changing status or stock.',
  ].join(' ');
}

function recommendationForMrp(): string {
  return [
    'MRP must be read/planning-only.',
    'Remove ItemEntity saves, stock assignments, inventory movements, or production status changes from MRP methods.',
  ].join(' ');
}

function inspectFile(
  path: string,
): Finding[] {
  const findings: Finding[] = [];
  const text =
    readFileSync(path, 'utf8');

  const source =
    ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

  const file =
    rel(path);

  function visit(
    node: ts.Node,
  ): void {
    const nodeText =
      node.getText(source);

    if (
      ts.isPropertyAccessExpression(
        node,
      )
    ) {
      const property =
        node.name.text;

      if (
        [
          'stockQty',
          'currentQty',
          'quantityOnHand',
          'onHand',
        ].includes(property)
      ) {
        findings.push({
          severity: 'BLOCKER',
          file,
          line:
            lineOf(source, node),
          method:
            methodName(node),
          category:
            'stock-contract',
          detail:
            `Legacy inventory property "${property}" is used.`,
          recommendation:
            recommendationForStock(),
        });
      }
    }

    if (
      ts.isBinaryExpression(node)
    ) {
      const left =
        node.left.getText(source);

      const operator =
        node.operatorToken.kind;

      const mutatingOperator =
        [
          ts.SyntaxKind
            .EqualsToken,
          ts.SyntaxKind
            .PlusEqualsToken,
          ts.SyntaxKind
            .MinusEqualsToken,
        ].includes(operator);

      if (
        mutatingOperator &&
        (
          left.endsWith(
            '.currentStock',
          ) ||
          left.includes(
            'current_stock',
          )
        )
      ) {
        const method =
          containingMethod(node);

        if (method) {
          if (
            !containsTransaction(
              method,
            )
          ) {
            findings.push({
              severity: 'BLOCKER',
              file,
              line:
                lineOf(
                  source,
                  node,
                ),
              method:
                method.name?.getText() ??
                null,
              category:
                'transaction',
              detail:
                'Inventory mutation occurs in a method with no obvious transaction boundary.',
              recommendation:
                recommendationForTransaction(),
            });
          }

          if (
            !containsLock(method)
          ) {
            findings.push({
              severity: 'HIGH',
              file,
              line:
                lineOf(
                  source,
                  node,
                ),
              method:
                method.name?.getText() ??
                null,
              category:
                'concurrency',
              detail:
                'Inventory mutation has no obvious row lock or atomic guarded update.',
              recommendation:
                recommendationForConcurrency(),
            });
          }
        }
      }
    }

    if (
      ts.isMethodDeclaration(
        node,
      )
    ) {
      const name =
        node.name?.getText() ??
        '';

      const bodyText =
        node.getText(source);

      if (
        (
          isConsumptionMethod(node) ||
          isCompletionMethod(node)
        ) &&
        !hasCompanyScope(node)
      ) {
        findings.push({
          severity: 'HIGH',
          file,
          line:
            lineOf(source, node),
          method: name,
          category:
            'company-scope',
          detail:
            'Critical manufacturing lifecycle method does not show an obvious companyId scope in its data access.',
          recommendation:
            'Scope every production order, item, BOM, warehouse, and consumption lookup by companyId. Cross-company references must fail before any mutation.',
        });
      }

      if (
        isCompletionMethod(node)
      ) {
        const statusGuard =
          /status[\s\S]{0,80}(Completed|COMPLETED)|already[\s\S]{0,80}complete/i.test(
            bodyText,
          );

        if (!statusGuard) {
          findings.push({
            severity: 'HIGH',
            file,
            line:
              lineOf(source, node),
            method: name,
            category:
              'idempotency',
            detail:
              'Completion-like method has no obvious already-completed guard.',
            recommendation:
              recommendationForCompletion(),
          });
        }
      }

      if (
        isMrpMethod(
          file,
          node,
        )
      ) {
        const mutatesInventory =
          /currentStock\s*(?:=|\+=|-=)|\.save\([\s\S]{0,100}item|inventoryMovement|stockMovement/i.test(
            bodyText,
          );

        if (mutatesInventory) {
          findings.push({
            severity: 'BLOCKER',
            file,
            line:
              lineOf(source, node),
            method: name,
            category:
              'mrp-mutation',
            detail:
              'MRP/planning method appears to mutate inventory.',
            recommendation:
              recommendationForMrp(),
          });
        }
      }
    }

    ts.forEachChild(
      node,
      visit,
    );
  }

  visit(source);

  if (
    file.endsWith(
      '.controller.ts',
    ) &&
    /@(Post|Patch|Put|Delete)\(/.test(
      text,
    ) &&
    !(
      text.includes(
        'JwtAuthGuard',
      ) &&
      text.includes(
        '@UseGuards',
      )
    )
  ) {
    findings.push({
      severity: 'HIGH',
      file,
      line: 1,
      method: null,
      category:
        'security',
      detail:
        'Manufacturing mutation controller lacks an obvious JwtAuthGuard.',
      recommendation:
        'Protect mutation routes with @UseGuards(JwtAuthGuard, RolesGuard as appropriate) and preserve company scoping in the service.',
    });
  }

  return findings;
}

function makeMarkdown(
  findings: Finding[],
): string {
  const lines = [
    '# Manufacturing Fix Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
  ];

  const severityOrder:
    Finding['severity'][] = [
      'BLOCKER',
      'HIGH',
      'MEDIUM',
      'INFO',
    ];

  for (
    const severity of
      severityOrder
  ) {
    const group =
      findings.filter(
        (finding) =>
          finding.severity ===
          severity,
      );

    if (!group.length) {
      continue;
    }

    lines.push(
      `## ${severity} (${group.length})`,
      '',
    );

    for (
      const finding of
        group
    ) {
      lines.push(
        `### ${finding.file}:${finding.line}`,
        '',
        `Method: \`${finding.method ?? 'n/a'}\``,
        '',
        `Category: \`${finding.category}\``,
        '',
        finding.detail,
        '',
        '**Recommended fix**',
        '',
        finding.recommendation,
        '',
      );
    }
  }

  if (!findings.length) {
    lines.push(
      'No manufacturing integrity defects were detected by this static analyzer.',
      '',
      'Continue with the manufacturing E2E because runtime transaction behavior still needs proof.',
    );
  }

  return lines.join('\n');
}

function main(): void {
  const files =
    ROOTS.flatMap(
      (root) =>
        walk(
          resolve(
            process.cwd(),
            root,
          ),
        ),
    );

  const findings =
    files.flatMap(
      inspectFile,
    );

  const priority = {
    BLOCKER: 0,
    HIGH: 1,
    MEDIUM: 2,
    INFO: 3,
  } as const;

  findings.sort(
    (a, b) =>
      priority[a.severity] -
        priority[b.severity] ||
      a.file.localeCompare(
        b.file,
      ) ||
      a.line - b.line,
  );

  const directory =
    resolve(
      process.cwd(),
      'artifacts',
    );

  mkdirSync(
    directory,
    {
      recursive: true,
    },
  );

  writeFileSync(
    join(
      directory,
      'manufacturing-fix-report.json',
    ),
    JSON.stringify(
      findings,
      null,
      2,
    ),
    'utf8',
  );

  writeFileSync(
    join(
      directory,
      'manufacturing-fix-report.md',
    ),
    makeMarkdown(
      findings,
    ),
    'utf8',
  );

  const blockers =
    findings.filter(
      (finding) =>
        finding.severity ===
        'BLOCKER',
    );

  const high =
    findings.filter(
      (finding) =>
        finding.severity ===
        'HIGH',
    );

  console.log(
    `Manufacturing fix analyzer scanned ${files.length} source file(s).`,
  );

  console.log(
    `BLOCKER: ${blockers.length}`,
  );

  console.log(
    `HIGH: ${high.length}`,
  );

  console.log(
    `TOTAL findings: ${findings.length}`,
  );

  console.log(
    '\nReports:',
  );

  console.log(
    '- artifacts/manufacturing-fix-report.json',
  );

  console.log(
    '- artifacts/manufacturing-fix-report.md',
  );

  if (
    blockers.length ||
    high.length
  ) {
    process.exitCode = 1;
  }
}

main();
