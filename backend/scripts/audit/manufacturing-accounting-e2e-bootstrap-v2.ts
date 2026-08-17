import {
  existsSync,
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

const file =
  resolve(
    process.cwd(),
    'test/manufacturing-accounting.e2e-spec.ts',
  );

if (!existsSync(file)) {
  console.error(
    'Manufacturing accounting E2E file is missing.',
  );
  process.exitCode = 1;
} else {
  const content =
    readFileSync(
      file,
      'utf8',
    );

  const checks = [
    {
      name:
        'dataSource assignment',
      pattern:
        /\bdataSource\s*=\s*[^;]+/,
    },
    {
      name:
        'Nest application initialization',
      pattern:
        /\bapp\s*=\s*[^;]+/,
    },
    {
      name:
        'companyId assignment',
      pattern:
        /\bcompanyId\s*=\s*[^;]+/,
    },
    {
      name:
        'materialConsumptionId assignment',
      pattern:
        /\bmaterialConsumptionId\s*=\s*[^;]+/,
    },
    {
      name:
        'productionOrderId assignment',
      pattern:
        /\bproductionOrderId\s*=\s*[^;]+/,
    },
    {
      name:
        'productionVarianceId assignment',
      pattern:
        /\bproductionVarianceId\s*=\s*[^;]+/,
    },
    {
      name:
        'rawMaterialsAccountId assignment',
      pattern:
        /\brawMaterialsAccountId\s*=\s*[^;]+/,
    },
    {
      name:
        'wipAccountId assignment',
      pattern:
        /\bwipAccountId\s*=\s*[^;]+/,
    },
    {
      name:
        'finishedGoodsAccountId assignment',
      pattern:
        /\bfinishedGoodsAccountId\s*=\s*[^;]+/,
    },
    {
      name:
        'manufacturingVarianceAccountId assignment',
      pattern:
        /\bmanufacturingVarianceAccountId\s*=\s*[^;]+/,
    },
  ];

  const missing =
    checks.filter(
      (check) =>
        !check.pattern.test(
          content,
        ),
    );

  if (missing.length) {
    console.error(
      `Manufacturing accounting E2E bootstrap still has ${missing.length} missing initialization(s):`,
    );

    for (const item of missing) {
      console.error(
        `- ${item.name}`,
      );
    }

    process.exitCode = 1;
  } else {
    console.log(
      'Manufacturing accounting E2E bootstrap readiness passed.',
    );
  }
}
