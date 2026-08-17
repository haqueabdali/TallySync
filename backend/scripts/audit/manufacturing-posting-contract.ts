import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import {
  basename,
  join,
  relative,
  resolve,
} from 'node:path';

import * as ts from 'typescript';

interface EntityField {
  name: string;
  type: string;
  nullable: boolean;
  databaseName: string | null;
}

interface EntityContract {
  file: string;
  className: string;
  table: string | null;
  fields: EntityField[];
}

interface CandidateContract {
  materialConsumption:
    | EntityContract
    | null;
  materialConsumptionLine:
    | EntityContract
    | null;
  productionOrder:
    | EntityContract
    | null;
  productionVariance:
    | EntityContract
    | null;
  productionVarianceLine:
    | EntityContract
    | null;
}

interface Finding {
  severity:
    | 'ERROR'
    | 'WARN'
    | 'INFO';
  area: string;
  detail: string;
}

const ROOTS = [
  'src/material-consumption',
  'src/production-orders',
  'src/production-variance',
  'src/costing-variance',
  'src/inventory-cost-engine',
];

function walk(
  directory: string,
): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const result: string[] = [];

  for (
    const name of readdirSync(
      directory,
    )
  ) {
    const path =
      join(directory, name);

    const stats =
      statSync(path);

    if (stats.isDirectory()) {
      result.push(
        ...walk(path),
      );
      continue;
    }

    if (
      name.endsWith('.ts') &&
      !name.endsWith('.spec.ts')
    ) {
      result.push(path);
    }
  }

  return result;
}

function rel(
  path: string,
): string {
  return relative(
    process.cwd(),
    path,
  ).replace(/\\/g, '/');
}

function decoratorsOf(
  node: ts.Node,
): readonly ts.Decorator[] {
  if (
    !ts.canHaveDecorators(node)
  ) {
    return [];
  }

  return (
    ts.getDecorators(node) ??
    []
  );
}

function decoratorName(
  decorator: ts.Decorator,
): string {
  const expression =
    decorator.expression;

  if (
    ts.isCallExpression(
      expression,
    )
  ) {
    return expression.expression.getText();
  }

  return expression.getText();
}

function decoratorArg(
  decorator: ts.Decorator,
  index = 0,
): string {
  const expression =
    decorator.expression;

  if (
    !ts.isCallExpression(
      expression,
    )
  ) {
    return '';
  }

  return (
    expression.arguments[index]
      ?.getText()
      .replace(
        /^['"`]|['"`]$/g,
        '',
      ) ?? ''
  );
}

function parseEntity(
  path: string,
): EntityContract[] {
  const source =
    ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

  const result:
    EntityContract[] = [];

  source.forEachChild((node) => {
    if (
      !ts.isClassDeclaration(
        node,
      ) ||
      !node.name
    ) {
      return;
    }

    const entityDecorator =
      decoratorsOf(node).find(
        (decorator) =>
          decoratorName(
            decorator,
          ) === 'Entity',
      );

    if (!entityDecorator) {
      return;
    }

    const fields:
      EntityField[] = [];

    for (
      const member of node.members
    ) {
      if (
        !ts.isPropertyDeclaration(
          member,
        )
      ) {
        continue;
      }

      const columnDecorator =
        decoratorsOf(member).find(
          (decorator) =>
            [
              'Column',
              'PrimaryGeneratedColumn',
              'PrimaryColumn',
              'CreateDateColumn',
              'UpdateDateColumn',
              'DeleteDateColumn',
            ].includes(
              decoratorName(
                decorator,
              ),
            ),
        );

      if (!columnDecorator) {
        continue;
      }

      const raw =
        columnDecorator.expression.getText();

      const dbName =
        raw.match(
          /name\s*:\s*['"`]([^'"`]+)['"`]/,
        )?.[1] ?? null;

      const nullable =
        raw.match(
          /nullable\s*:\s*true/,
        ) !== null;

      fields.push({
        name:
          member.name.getText(),
        type:
          member.type?.getText() ??
          'unknown',
        nullable,
        databaseName:
          dbName,
      });
    }

    result.push({
      file: rel(path),
      className:
        node.name.text,
      table:
        decoratorArg(
          entityDecorator,
        ) || null,
      fields,
    });
  });

  return result;
}

function findEntity(
  entities: EntityContract[],
  signals: string[],
): EntityContract | null {
  return (
    entities
      .map((entity) => {
        const haystack =
          `${entity.file} ${entity.className} ${entity.table ?? ''}`
            .toLowerCase();

        const score =
          signals.reduce(
            (
              total,
              signal,
            ) =>
              total +
              (
                haystack.includes(
                  signal.toLowerCase(),
                )
                  ? 1
                  : 0
              ),
            0,
          );

        return {
          entity,
          score,
        };
      })
      .filter(
        (entry) =>
          entry.score > 0,
      )
      .sort(
        (a, b) =>
          b.score -
          a.score,
      )[0]?.entity ??
    null
  );
}

function field(
  entity:
    | EntityContract
    | null,
  names: string[],
): string | null {
  if (!entity) {
    return null;
  }

  for (const name of names) {
    const exact =
      entity.fields.find(
        (candidate) =>
          candidate.name === name,
      );

    if (exact) {
      return exact.name;
    }
  }

  return null;
}

function anyField(
  entity:
    | EntityContract
    | null,
  includes:
    string[],
): string | null {
  if (!entity) {
    return null;
  }

  const found =
    entity.fields.find(
      (candidate) => {
        const lower =
          candidate.name.toLowerCase();

        return includes.every(
          (fragment) =>
            lower.includes(
              fragment.toLowerCase(),
            ),
        );
      },
    );

  return found?.name ?? null;
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

  const entityFiles =
    files.filter(
      (file) =>
        file.endsWith(
          '.entity.ts',
        ),
    );

  const entities =
    entityFiles.flatMap(
      parseEntity,
    );

  const contract:
    CandidateContract = {
    materialConsumption:
      findEntity(
        entities,
        [
          'material-consumption.entity',
          'MaterialConsumption',
          'material_consumptions',
        ],
      ),

    materialConsumptionLine:
      findEntity(
        entities,
        [
          'material-consumption-line',
          'MaterialConsumptionLine',
          'material_consumption_lines',
        ],
      ),

    productionOrder:
      findEntity(
        entities,
        [
          'production-order.entity',
          'ProductionOrder',
          'production_orders',
        ],
      ),

    productionVariance:
      findEntity(
        entities,
        [
          'production-variance.entity',
          'ProductionVariance',
          'production_variances',
        ],
      ),

    productionVarianceLine:
      findEntity(
        entities,
        [
          'production-variance-line',
          'ProductionVarianceLine',
          'production_variance_lines',
        ],
      ),
  };

  const findings:
    Finding[] = [];

  for (
    const [
      key,
      value,
    ] of Object.entries(
      contract,
    )
  ) {
    if (!value) {
      findings.push({
        severity: 'ERROR',
        area: key,
        detail:
          `Unable to identify the active ${key} entity.`,
      });
    }
  }

  const mc =
    contract.materialConsumption;

  const mcLine =
    contract.materialConsumptionLine;

  const po =
    contract.productionOrder;

  const pv =
    contract.productionVariance;

  const materialConsumptionFields = {
    id:
      field(mc, ['id']),
    companyId:
      field(
        mc,
        ['companyId'],
      ),
    status:
      field(
        mc,
        ['status'],
      ),
    documentNumber:
      field(
        mc,
        [
          'consumptionNumber',
          'documentNumber',
          'number',
        ],
      ),
    productionOrderId:
      field(
        mc,
        [
          'productionOrderId',
        ],
      ),
    totalCost:
      field(
        mc,
        [
          'totalCost',
          'materialCost',
          'totalMaterialCost',
        ],
      ),
  };

  const materialLineFields = {
    quantity:
      field(
        mcLine,
        [
          'quantity',
          'consumedQuantity',
          'issuedQuantity',
        ],
      ),
    unitCost:
      field(
        mcLine,
        [
          'unitCost',
          'costPerUnit',
          'averageCost',
        ],
      ),
    lineCost:
      field(
        mcLine,
        [
          'lineCost',
          'totalCost',
          'materialCost',
          'amount',
        ],
      ),
    itemId:
      field(
        mcLine,
        ['itemId'],
      ),
  };

  const productionOrderFields = {
    id:
      field(po, ['id']),
    companyId:
      field(
        po,
        ['companyId'],
      ),
    status:
      field(
        po,
        ['status'],
      ),
    orderNumber:
      field(
        po,
        [
          'productionOrderNumber',
          'orderNumber',
          'number',
        ],
      ),
    itemId:
      field(
        po,
        [
          'itemId',
          'finishedGoodItemId',
          'finishedItemId',
        ],
      ),
    completedQuantity:
      field(
        po,
        [
          'completedQuantity',
          'actualQuantity',
          'producedQuantity',
          'quantity',
        ],
      ),
    actualMaterialCost:
      field(
        po,
        [
          'actualMaterialCost',
        ],
      ),
    actualLaborCost:
      field(
        po,
        [
          'actualLaborCost',
        ],
      ),
    actualOverheadCost:
      field(
        po,
        [
          'actualOverheadCost',
        ],
      ),
    actualTotalCost:
      field(
        po,
        [
          'actualTotalCost',
          'totalActualCost',
          'actualCost',
        ],
      ),
  };

  const productionVarianceFields = {
    id:
      field(pv, ['id']),
    companyId:
      field(
        pv,
        ['companyId'],
      ),
    status:
      field(
        pv,
        ['status'],
      ),
    productionOrderId:
      field(
        pv,
        [
          'productionOrderId',
        ],
      ),
    varianceNumber:
      field(
        pv,
        [
          'varianceNumber',
          'documentNumber',
          'number',
        ],
      ),
    totalVariance:
      field(
        pv,
        [
          'totalVariance',
          'varianceAmount',
          'totalVarianceAmount',
        ],
      ),
  };

  if (
    !materialConsumptionFields
      .totalCost &&
    !(
      materialLineFields
        .lineCost ||
      (
        materialLineFields
          .quantity &&
        materialLineFields
          .unitCost
      )
    )
  ) {
    findings.push({
      severity: 'ERROR',
      area:
        'material-consumption',
      detail:
        'No reliable material-consumption cost field was detected on the header or line entity.',
    });
  }

  if (
    !productionOrderFields
      .actualTotalCost &&
    !(
      productionOrderFields
        .actualMaterialCost &&
      productionOrderFields
        .actualLaborCost &&
      productionOrderFields
        .actualOverheadCost
    )
  ) {
    findings.push({
      severity: 'ERROR',
      area:
        'production-completion',
      detail:
        'No reliable completed actual-cost contract was detected on ProductionOrder.',
    });
  }

  if (
    !productionVarianceFields
      .totalVariance
  ) {
    findings.push({
      severity: 'ERROR',
      area:
        'production-variance',
      detail:
        'No total production-variance amount field was detected.',
    });
  }

  const report = {
    generatedAt:
      new Date().toISOString(),
    entities,
    contract,
    detectedFields: {
      materialConsumption:
        materialConsumptionFields,
      materialConsumptionLine:
        materialLineFields,
      productionOrder:
        productionOrderFields,
      productionVariance:
        productionVarianceFields,
    },
    findings,
  };

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
      'manufacturing-posting-contract.json',
    ),
    JSON.stringify(
      report,
      null,
      2,
    ),
    'utf8',
  );

  const lines = [
    '# Manufacturing Posting Contract',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Detected entity fields',
    '',
    '```json',
    JSON.stringify(
      report.detectedFields,
      null,
      2,
    ),
    '```',
    '',
    '## Findings',
    '',
  ];

  if (!findings.length) {
    lines.push(
      'No blocking posting-contract gaps detected.',
    );
  } else {
    for (
      const finding of findings
    ) {
      lines.push(
        `- **${finding.severity}** [${finding.area}] ${finding.detail}`,
      );
    }
  }

  writeFileSync(
    join(
      directory,
      'manufacturing-posting-contract.md',
    ),
    lines.join('\n'),
    'utf8',
  );

  console.log(
    `Manufacturing posting contract extracted. Findings=${findings.length}`,
  );

  console.log(
    '- artifacts/manufacturing-posting-contract.json',
  );

  console.log(
    '- artifacts/manufacturing-posting-contract.md',
  );

  if (
    findings.some(
      (finding) =>
        finding.severity ===
        'ERROR',
    )
  ) {
    process.exitCode = 1;
  }
}

main();
