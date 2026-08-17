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

interface Finding {
  severity: 'BLOCKER' | 'HIGH' | 'WARN' | 'INFO';
  area: string;
  file: string;
  detail: string;
  recommendation: string;
}

const SOURCE_ROOTS = [
  'src/accounting-settings',
  'src/accounting-engine',
  'src/journal-entries',
  'src/production-orders',
  'src/material-consumption',
  'src/production-variance',
  'src/costing-variance',
  'src/inventory-cost-engine',
];

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const result: string[] = [];

  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      result.push(...walk(path));
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

function rel(path: string): string {
  return relative(process.cwd(), path)
    .replace(/\\/g, '/');
}

function containsAny(
  content: string,
  values: string[],
): boolean {
  return values.some((value) =>
    content.toLowerCase().includes(
      value.toLowerCase(),
    ),
  );
}

function main(): void {
  const findings: Finding[] = [];

  const files = SOURCE_ROOTS.flatMap((root) =>
    walk(resolve(process.cwd(), root)),
  );

  const settingsEntity =
    files.find((file) =>
      file.endsWith(
        'accounting-settings.entity.ts',
      ),
    );

  if (!settingsEntity) {
    findings.push({
      severity: 'BLOCKER',
      area: 'accounting-settings',
      file:
        'src/accounting-settings/entities/accounting-settings.entity.ts',
      detail:
        'AccountingSettingsEntity was not found.',
      recommendation:
        'Restore/locate the active AccountingSettingsEntity before manufacturing GL wiring.',
    });
  } else {
    const content =
      readFileSync(settingsEntity, 'utf8');

    const requiredMappings = [
      {
        label:
          'Raw Materials Inventory',
        signals: [
          'rawMaterials',
          'raw_material',
          'materialsInventory',
        ],
      },
      {
        label:
          'Work In Progress',
        signals: [
          'workInProgress',
          'work_in_progress',
          'wipAccount',
        ],
      },
      {
        label:
          'Finished Goods Inventory',
        signals: [
          'finishedGoods',
          'finished_goods',
        ],
      },
      {
        label:
          'Manufacturing Variance',
        signals: [
          'manufacturingVariance',
          'manufacturing_variance',
          'productionVarianceAccount',
        ],
      },
      {
        label:
          'Direct Labor',
        signals: [
          'directLabor',
          'direct_labor',
        ],
      },
      {
        label:
          'Manufacturing Overhead',
        signals: [
          'manufacturingOverhead',
          'manufacturing_overhead',
          'overheadAccount',
        ],
      },
    ];

    for (const mapping of requiredMappings) {
      if (
        !containsAny(
          content,
          mapping.signals,
        )
      ) {
        findings.push({
          severity: 'HIGH',
          area:
            'accounting-settings',
          file: rel(settingsEntity),
          detail:
            `${mapping.label} account mapping was not detected.`,
          recommendation:
            `Add a nullable UUID account mapping for ${mapping.label}; validate it through AccountingSettingsService instead of hard-coding an account ID.`,
        });
      }
    }
  }

  const sourceEnum =
    files.find((file) =>
      file.endsWith(
        'journal-entry-source-type.enum.ts',
      ),
    );

  if (!sourceEnum) {
    findings.push({
      severity: 'BLOCKER',
      area:
        'journal-source',
      file:
        'src/journal-entries/enums/journal-entry-source-type.enum.ts',
      detail:
        'Journal source enum was not found.',
      recommendation:
        'Locate the active journal source enum before adding manufacturing source documents.',
    });
  } else {
    const content =
      readFileSync(sourceEnum, 'utf8');

    const sources = [
      {
        label:
          'material consumption',
        signals: [
          'material_consumption',
          'MATERIAL_CONSUMPTION',
        ],
      },
      {
        label:
          'production completion',
        signals: [
          'production_completion',
          'PRODUCTION_COMPLETION',
          'finished_goods_receipt',
          'FINISHED_GOODS_RECEIPT',
        ],
      },
      {
        label:
          'production variance',
        signals: [
          'production_variance',
          'PRODUCTION_VARIANCE',
        ],
      },
    ];

    for (const source of sources) {
      if (
        !containsAny(
          content,
          source.signals,
        )
      ) {
        findings.push({
          severity: 'HIGH',
          area:
            'journal-source',
          file: rel(sourceEnum),
          detail:
            `No journal source type detected for ${source.label}.`,
          recommendation:
            `Add an explicit source enum for ${source.label} before wiring an accounting posting rule.`,
        });
      }
    }
  }

  const postingRules =
    files.filter((file) =>
      file.includes(
        '/posting-rules/',
      ) ||
      file.replace(/\\/g, '/').includes(
        '/posting-rules/',
      ),
    );

  const ruleText =
    postingRules
      .map((file) =>
        readFileSync(file, 'utf8'),
      )
      .join('\n');

  const ruleChecks = [
    {
      label:
        'Material Consumption posting rule',
      signals: [
        'MaterialConsumptionPostingRule',
        'material_consumption',
      ],
      recommended:
        'WIP Dr / Raw Materials Inventory Cr',
    },
    {
      label:
        'Production Completion posting rule',
      signals: [
        'ProductionCompletionPostingRule',
        'FinishedGoodsReceiptPostingRule',
        'production_completion',
        'finished_goods_receipt',
      ],
      recommended:
        'Finished Goods Inventory Dr / WIP Cr',
    },
    {
      label:
        'Production Variance posting rule',
      signals: [
        'ProductionVariancePostingRule',
        'production_variance',
      ],
      recommended:
        'Manufacturing Variance Dr/Cr with WIP balancing line',
    },
  ];

  for (const check of ruleChecks) {
    if (
      !containsAny(
        ruleText,
        check.signals,
      )
    ) {
      findings.push({
        severity: 'HIGH',
        area:
          'accounting-engine',
        file:
          'src/accounting-engine/posting-rules',
        detail:
          `${check.label} was not detected.`,
        recommendation:
          `Implement only after account mappings exist. Expected conceptual posting: ${check.recommended}.`,
      });
    }
  }

  const materialService =
    files.find((file) =>
      file.endsWith(
        'material-consumption.service.ts',
      ),
    );

  if (materialService) {
    const content =
      readFileSync(
        materialService,
        'utf8',
      );

    if (
      !containsAny(
        content,
        [
          'AccountingEngineService',
          'postMaterialConsumption',
        ],
      )
    ) {
      findings.push({
        severity: 'WARN',
        area:
          'material-consumption',
        file:
          rel(materialService),
        detail:
          'Material Consumption does not appear to invoke the Accounting Engine.',
        recommendation:
          'Keep operational stock mutation and accounting journal posting separate: commit stock/consumption first, then call the idempotent Accounting Engine.',
      });
    }
  }

  const productionServices =
    files.filter((file) =>
      file.endsWith(
        '.service.ts',
      ) &&
      (
        file.includes(
          'production-orders',
        ) ||
        file.includes(
          'production-variance',
        ) ||
        file.includes(
          'costing-variance',
        )
      ),
    );

  const productionText =
    productionServices
      .map((file) =>
        readFileSync(file, 'utf8'),
      )
      .join('\n');

  if (
    !containsAny(
      productionText,
      [
        'actualMaterialCost',
        'actual_material_cost',
      ],
    )
  ) {
    findings.push({
      severity: 'WARN',
      area:
        'manufacturing-cost',
      file:
        'production/costing services',
      detail:
        'Actual material cost capture was not detected.',
      recommendation:
        'Use the Inventory Cost Engine valuation generated at material issue time; do not use selling price.',
    });
  }

  if (
    !containsAny(
      productionText,
      [
        'actualLaborCost',
        'actual_labor_cost',
      ],
    )
  ) {
    findings.push({
      severity: 'WARN',
      area:
        'manufacturing-cost',
      file:
        'production/costing services',
      detail:
        'Actual labor cost capture was not detected.',
      recommendation:
        'Keep labor cost explicit and separate from material valuation so variance analysis remains explainable.',
    });
  }

  if (
    !containsAny(
      productionText,
      [
        'actualOverheadCost',
        'actual_overhead_cost',
      ],
    )
  ) {
    findings.push({
      severity: 'WARN',
      area:
        'manufacturing-cost',
      file:
        'production/costing services',
      detail:
        'Actual overhead cost capture was not detected.',
      recommendation:
        'Track overhead separately from materials/labor; post it to WIP only when your costing policy defines the basis.',
    });
  }

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

  const outputDir =
    resolve(
      process.cwd(),
      'artifacts',
    );

  mkdirSync(
    outputDir,
    {
      recursive: true,
    },
  );

  writeFileSync(
    join(
      outputDir,
      'manufacturing-accounting-readiness.json',
    ),
    JSON.stringify(
      findings,
      null,
      2,
    ),
    'utf8',
  );

  const lines = [
    '# Manufacturing Accounting Readiness',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
  ];

  for (
    const severity of [
      'BLOCKER',
      'HIGH',
      'WARN',
      'INFO',
    ] as const
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

    for (const finding of group) {
      lines.push(
        `### ${finding.area}`,
        '',
        `File: \`${finding.file}\``,
        '',
        finding.detail,
        '',
        '**Recommendation**',
        '',
        finding.recommendation,
        '',
      );
    }
  }

  if (!findings.length) {
    lines.push(
      'No obvious manufacturing-accounting contract gaps were detected.',
    );
  }

  writeFileSync(
    join(
      outputDir,
      'manufacturing-accounting-readiness.md',
    ),
    lines.join('\n'),
    'utf8',
  );

  console.log(
    `Manufacturing accounting readiness: BLOCKER=${blockers.length}, HIGH=${high.length}, TOTAL=${findings.length}`,
  );

  console.log(
    'Reports:',
  );

  console.log(
    '- artifacts/manufacturing-accounting-readiness.json',
  );

  console.log(
    '- artifacts/manufacturing-accounting-readiness.md',
  );

  if (
    blockers.length ||
    high.length
  ) {
    process.exitCode = 1;
  }
}

main();
