import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

import * as ts from 'typescript';

type Severity =
  | 'ERROR'
  | 'WARN'
  | 'INFO';

interface MethodInfo {
  name: string;
  text: string;
  line: number;
}

interface Finding {
  severity: Severity;
  label: string;
  file: string;
  detail: string;
}

function lineOf(
  source: ts.SourceFile,
  node: ts.Node,
): number {
  return (
    source
      .getLineAndCharacterOfPosition(
        node.getStart(source),
      )
      .line + 1
  );
}

function methodsOf(
  file: string,
): MethodInfo[] {
  const path =
    resolve(
      process.cwd(),
      file,
    );

  if (!existsSync(path)) {
    return [];
  }

  const source =
    ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

  const methods:
    MethodInfo[] = [];

  source.forEachChild((node) => {
    if (!ts.isClassDeclaration(node)) {
      return;
    }

    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) {
        continue;
      }

      methods.push({
        name:
          member.name?.getText(source) ??
          '',
        text:
          member.getText(source),
        line:
          lineOf(source, member),
      });
    }
  });

  return methods;
}

function push(
  findings: Finding[],
  severity: Severity,
  label: string,
  file: string,
  detail: string,
): void {
  findings.push({
    severity,
    label,
    file,
    detail,
  });
}

function main(): void {
  const findings:
    Finding[] = [];

  /*
   * MATERIAL CONSUMPTION
   *
   * The current implementation posts immediately after create(), so create()
   * is the actual finalized lifecycle for this aggregate.
   */
  {
    const file =
      'src/material-consumption/material-consumption.service.ts';

    const methods =
      methodsOf(file);

    const create =
      methods.find(
        (method) =>
          method.name ===
          'create',
      );

    const helper =
      methods.find(
        (method) =>
          method.name ===
          'autoPostMaterialConsumptionIfEnabled',
      );

    if (!create) {
      push(
        findings,
        'ERROR',
        'Material Consumption',
        file,
        'create() lifecycle method not found.',
      );
    } else {
      push(
        findings,
        'INFO',
        'Material Consumption',
        file,
        `Lifecycle method detected: create() at line ${create.line}.`,
      );

      if (
        !create.text.includes(
          'autoPostMaterialConsumptionIfEnabled',
        )
      ) {
        push(
          findings,
          'ERROR',
          'Material Consumption',
          file,
          'create() does not call autoPostMaterialConsumptionIfEnabled().',
        );
      }

      if (
        !/dataSource\.transaction\s*\(/.test(
          create.text,
        )
      ) {
        push(
          findings,
          'ERROR',
          'Material Consumption',
          file,
          'create() must persist material consumption inside a transaction.',
        );
      }

      /*
       * A POST retry guard is not meaningful for create() because the API has
       * no existing source ID. Duplicate creation is protected instead by
       * companyId + consumptionNumber.
       */
      if (
        !/consumptionNumber/.test(
          readFileSync(
            resolve(
              process.cwd(),
              file,
            ),
            'utf8',
          ),
        )
      ) {
        push(
          findings,
          'WARN',
          'Material Consumption',
          file,
          'No stable duplicate business key detected for create() retries.',
        );
      } else {
        push(
          findings,
          'INFO',
          'Material Consumption',
          file,
          'Create retry protection uses the consumptionNumber business key.',
        );
      }
    }

    if (!helper) {
      push(
        findings,
        'ERROR',
        'Material Consumption',
        file,
        'autoPostMaterialConsumptionIfEnabled() helper not found.',
      );
    }
  }

  /*
   * PRODUCTION COMPLETION
   *
   * update() is NOT a completion lifecycle in the current implementation:
   * it explicitly allows only DRAFT orders. Do not force accounting into it.
   * A real complete()/finish() operation must exist before completion
   * auto-post can be considered implemented.
   */
  {
    const file =
      'src/production-orders/production-orders.service.ts';

    const methods =
      methodsOf(file);

    const completion =
      methods.find(
        (method) =>
          [
            'complete',
            'finish',
            'close',
            'receiveFinishedGoods',
          ].includes(
            method.name,
          ),
      );

    const helper =
      methods.find(
        (method) =>
          method.name ===
          'autoPostProductionCompletionIfEnabled',
      );

    if (!completion) {
      push(
        findings,
        'ERROR',
        'Production Completion',
        file,
        'No real production-completion lifecycle method exists. update() only edits DRAFT orders and must not be treated as completion.',
      );
    } else {
      push(
        findings,
        'INFO',
        'Production Completion',
        file,
        `Lifecycle method detected: ${completion.name}() at line ${completion.line}.`,
      );

      if (
        !completion.text.includes(
          'autoPostProductionCompletionIfEnabled',
        )
      ) {
        push(
          findings,
          'ERROR',
          'Production Completion',
          file,
          `${completion.name}() does not call autoPostProductionCompletionIfEnabled().`,
        );
      }

      if (
        !/COMPLETED/.test(
          completion.text,
        )
      ) {
        push(
          findings,
          'WARN',
          'Production Completion',
          file,
          `${completion.name}() has no obvious COMPLETED-state guard.`,
        );
      }
    }

    if (!helper) {
      push(
        findings,
        'ERROR',
        'Production Completion',
        file,
        'autoPostProductionCompletionIfEnabled() helper not found.',
      );
    }
  }

  /*
   * PRODUCTION VARIANCE
   *
   * The current post() already creates and posts a journal directly through
   * JournalEntriesService. Calling AccountingEngineService as well would
   * double-post. Flag that mixed architecture explicitly.
   */
  {
    const file =
      'src/production-variance/production-variance.service.ts';

    const methods =
      methodsOf(file);

    const post =
      methods.find(
        (method) =>
          method.name ===
          'post',
      );

    if (!post) {
      push(
        findings,
        'ERROR',
        'Production Variance',
        file,
        'post() lifecycle method not found.',
      );
    } else {
      push(
        findings,
        'INFO',
        'Production Variance',
        file,
        `Lifecycle method detected: post() at line ${post.line}.`,
      );

      const directJournal =
        post.text.includes(
          'journalEntriesService.create',
        ) ||
        post.text.includes(
          'journalEntriesService.post',
        );

      const enginePost =
        post.text.includes(
          'autoPostProductionVarianceIfEnabled',
        ) ||
        post.text.includes(
          'postProductionVariance',
        );

      if (
        directJournal &&
        enginePost
      ) {
        push(
          findings,
          'ERROR',
          'Production Variance',
          file,
          'post() mixes direct JournalEntriesService posting with AccountingEngineService posting. This can double-post.',
        );
      } else if (directJournal) {
        push(
          findings,
          'WARN',
          'Production Variance',
          file,
          'post() still uses the legacy direct JournalEntriesService path. Migrate it to AccountingEngineService before the manufacturing accounting E2E is final.',
        );
      } else if (!enginePost) {
        push(
          findings,
          'ERROR',
          'Production Variance',
          file,
          'post() does not invoke the Accounting Engine.',
        );
      }

      if (
        !/ProductionVarianceStatus\.POSTED/.test(
          post.text,
        )
      ) {
        push(
          findings,
          'WARN',
          'Production Variance',
          file,
          'post() has no obvious already-POSTED idempotency guard.',
        );
      }
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
      'manufacturing-lifecycle-autopost.json',
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
      'manufacturing-lifecycle-autopost.md',
    ),
    [
      '# Manufacturing Lifecycle Auto-post',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Summary: ERROR=${errors.length}, WARN=${warnings.length}, INFO=${infos.length}`,
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
    ].join('\n'),
    'utf8',
  );

  console.log(
    `Manufacturing lifecycle auto-post: ERROR=${errors.length}, WARN=${warnings.length}, INFO=${infos.length}, TOTAL=${findings.length}`,
  );

  console.log(
    '- artifacts/manufacturing-lifecycle-autopost.json',
  );

  console.log(
    '- artifacts/manufacturing-lifecycle-autopost.md',
  );

  if (errors.length) {
    process.exitCode = 1;
  }
}

main();