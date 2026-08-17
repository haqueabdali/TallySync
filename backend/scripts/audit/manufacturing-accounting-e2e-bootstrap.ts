import {
  existsSync,
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

function main(): void {
  const path =
    resolve(
      process.cwd(),
      'test/manufacturing-accounting.e2e-spec.ts',
    );

  if (!existsSync(path)) {
    console.error(
      'manufacturing-accounting.e2e-spec.ts is missing.',
    );
    process.exitCode = 1;
    return;
  }

  const content =
    readFileSync(path, 'utf8');

  const errors: string[] = [];

  if (
    /beforeAll\s*\(\s*async\s*\(\)\s*=>\s*\{\s*\/\*/m.test(
      content,
    )
  ) {
    errors.push(
      'beforeAll() is still the generated placeholder.',
    );
  }

  if (
    !/dataSource\s*=\s*/.test(
      content,
    )
  ) {
    errors.push(
      'dataSource is declared but never assigned.',
    );
  }

  for (const variable of [
    'companyId',
    'materialConsumptionId',
    'productionOrderId',
    'productionVarianceId',
    'rawMaterialsAccountId',
    'wipAccountId',
    'finishedGoodsAccountId',
    'manufacturingVarianceAccountId',
  ]) {
    const assignment =
      new RegExp(
        `\\b${variable}\\s*=\\s*[^;\\n]+`,
      );

    if (!assignment.test(content)) {
      errors.push(
        `${variable} is never initialized.`,
      );
    }
  }

  if (errors.length) {
    console.error(
      `Manufacturing accounting E2E bootstrap FAILED with ${errors.length} problem(s):`,
    );

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    console.error(
      '\nDo not run the accounting reconciliation E2E until the fixture/bootstrap is real.',
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    'Manufacturing accounting E2E bootstrap audit passed.',
  );
}

main();
