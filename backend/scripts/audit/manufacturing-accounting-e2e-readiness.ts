import {
  existsSync,
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

const required = [
  'src/accounting-engine/posting-rules/material-consumption.rule.ts',
  'src/accounting-engine/posting-rules/production-completion.rule.ts',
  'src/accounting-engine/posting-rules/production-variance.rule.ts',
  'test/helpers/manufacturing-accounting.helper.ts',
  'test/manufacturing-accounting.e2e-spec.ts',
];

let failed = false;

for (const file of required) {
  const path =
    resolve(
      process.cwd(),
      file,
    );

  if (!existsSync(path)) {
    console.error(
      `Missing: ${file}`,
    );
    failed = true;
  }
}

const enginePath =
  resolve(
    process.cwd(),
    'src/accounting-engine/accounting-engine.service.ts',
  );

if (existsSync(enginePath)) {
  const content =
    readFileSync(
      enginePath,
      'utf8',
    );

  for (const method of [
    'postMaterialConsumption',
    'postProductionCompletion',
    'postProductionVariance',
  ]) {
    if (!content.includes(method)) {
      console.error(
        `AccountingEngineService missing ${method}()`,
      );
      failed = true;
    }
  }
}

const enumPath =
  resolve(
    process.cwd(),
    'src/journal-entries/enums/journal-entry-source-type.enum.ts',
  );

if (existsSync(enumPath)) {
  const content =
    readFileSync(
      enumPath,
      'utf8',
    );

  for (const value of [
    'material_consumption',
    'production_completion',
    'production_variance',
  ]) {
    if (!content.includes(value)) {
      console.error(
        `JournalEntrySourceType missing ${value}`,
      );
      failed = true;
    }
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(
    'Manufacturing accounting E2E readiness audit passed.',
  );
}
