import {
  existsSync,
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

interface Check {
  file: string;
  mustContain?: string[];
  mustNotContain?: string[];
}

const checks: Check[] = [
  {
    file:
      'src/journal-entries/enums/journal-entry-source-type.enum.ts',
    mustContain: [
      "PURCHASE_RETURN = 'purchase_return'",
    ],
  },
  {
    file:
      'src/accounting-engine/posting-rules/purchase-return.rule.ts',
    mustContain: [
      'class PurchaseReturnPostingRule',
      'JournalEntrySourceType.PURCHASE_RETURN',
    ],
  },
  {
    file:
      'src/accounting-engine/accounting-engine.service.ts',
    mustContain: [
      'PurchaseReturnPostingRule',
      'postPurchaseReturn(',
      'JournalEntrySourceType.PURCHASE_RETURN',
    ],
  },
  {
    file:
      'src/accounting-engine/accounting-engine.module.ts',
    mustContain: [
      'PurchaseReturnPostingRule',
      'PurchaseReturn',
    ],
  },
  {
    file:
      'src/purchase-returns/purchase-returns.service.ts',
    mustContain: [
      'AccountingEngineService',
      'autoPostAccountingIfEnabled',
      'postPurchaseReturn',
    ],
  },
  {
    file:
      'src/accounting-settings/entities/accounting-settings.entity.ts',
    mustContain: [
      'purchase_returns_account_id',
      'auto_post_purchase_returns',
    ],
  },
];

function main(): void {
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const check of checks) {
    const path =
      resolve(process.cwd(), check.file);

    if (!existsSync(path)) {
      failures.push(
        `${check.file}: file not found`,
      );
      continue;
    }

    const content =
      readFileSync(
        path,
        'utf8',
      );

    for (
      const value of
        check.mustContain ?? []
    ) {
      if (!content.includes(value)) {
        failures.push(
          `${check.file}: missing "${value}"`,
        );
      }
    }

    for (
      const value of
        check.mustNotContain ?? []
    ) {
      if (content.includes(value)) {
        failures.push(
          `${check.file}: stale "${value}" detected`,
        );
      }
    }
  }

  const salesReturnPath =
    resolve(
      process.cwd(),
      'src/sales-returns/sales-returns.service.ts',
    );

  if (existsSync(salesReturnPath)) {
    const content =
      readFileSync(
        salesReturnPath,
        'utf8',
      );

    const importsInventoryEntity =
      content.includes(
        "../inventory/entities/item.entity",
      );

    const usesStockQty =
      /\bitem\.stockQty\b/.test(
        content,
      );

    const usesCurrentStock =
      /\bitem\.currentStock\b/.test(
        content,
      );

    if (
      importsInventoryEntity &&
      usesStockQty &&
      !usesCurrentStock
    ) {
      warnings.push(
        'sales-returns.service.ts still uses item.stockQty. Verify that the active ItemEntity really exposes stockQty; the newer commercial flows use currentStock.',
      );
    }
  }

  if (warnings.length) {
    console.log(
      `Returns readiness warnings (${warnings.length}):`,
    );

    for (const warning of warnings) {
      console.log(
        `- ${warning}`,
      );
    }
  }

  if (failures.length) {
    console.error(
      `Returns readiness audit FAILED with ${failures.length} error(s):`,
    );

    for (const failure of failures) {
      console.error(
        `- ${failure}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    'Returns readiness audit passed: Purchase Return accounting bridge is wired.',
  );
}

main();
