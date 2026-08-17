import {
  runManufacturingAccountingEngineSmoke,
} from '../scripts/e2e/manufacturing-accounting-engine-smoke';

describe(
  'Manufacturing Accounting Reconciliation (e2e)',
  () => {
    jest.setTimeout(
      120_000,
    );

    it(
      'posts and reconciles all manufacturing accounting sources exactly once',
      async () => {
        await expect(
          runManufacturingAccountingEngineSmoke(),
        ).resolves.toBeUndefined();
      },
    );
  },
);