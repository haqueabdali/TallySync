import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  join,
  resolve,
} from 'node:path';

type Level = 'ERROR' | 'WARN';

interface Finding {
  level: Level;
  file: string;
  detail: string;
}

const REQUIRED_PATHS = [
  'src/bill-of-materials',
  'src/production-orders',
  'src/manufacturing-mrp',
  'src/material-consumption',
  'src/production-variance',
];

const EXPECTED_FILES: Array<{
  path: string;
  tokens: string[];
}> = [
  {
    path:
      'src/bill-of-materials/bill-of-materials.module.ts',
    tokens: [
      '@Module',
    ],
  },
  {
    path:
      'src/production-orders/production-orders.module.ts',
    tokens: [
      '@Module',
    ],
  },
  {
    path:
      'src/material-consumption/material-consumption.module.ts',
    tokens: [
      '@Module',
    ],
  },
  {
    path:
      'src/manufacturing-mrp/manufacturing-mrp.module.ts',
    tokens: [
      '@Module',
    ],
  },
];

function allTsFiles(
  directory: string,
): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const output: string[] = [];

  for (
    const entry of readdirSync(
      directory,
    )
  ) {
    const path =
      join(directory, entry);

    const stats =
      statSync(path);

    if (stats.isDirectory()) {
      output.push(
        ...allTsFiles(path),
      );
      continue;
    }

    if (entry.endsWith('.ts')) {
      output.push(path);
    }
  }

  return output;
}

function relative(
  path: string,
): string {
  return path
    .replace(
      process.cwd(),
      '',
    )
    .replace(
      /^[\\/]/,
      '',
    )
    .replace(/\\/g, '/');
}

function main(): void {
  const findings: Finding[] = [];

  for (
    const requiredPath of
      REQUIRED_PATHS
  ) {
    const absolute =
      resolve(
        process.cwd(),
        requiredPath,
      );

    if (!existsSync(absolute)) {
      findings.push({
        level: 'ERROR',
        file: requiredPath,
        detail:
          'Required manufacturing module directory is missing.',
      });
    }
  }

  for (
    const expected of
      EXPECTED_FILES
  ) {
    const absolute =
      resolve(
        process.cwd(),
        expected.path,
      );

    if (!existsSync(absolute)) {
      findings.push({
        level: 'ERROR',
        file: expected.path,
        detail:
          'Required module file is missing.',
      });
      continue;
    }

    const content =
      readFileSync(
        absolute,
        'utf8',
      );

    for (
      const token of
        expected.tokens
    ) {
      if (!content.includes(token)) {
        findings.push({
          level: 'ERROR',
          file: expected.path,
          detail:
            `Expected token "${token}" was not found.`,
        });
      }
    }
  }

  /*
   * Inventory contract audit.
   *
   * The commercial flows now use ItemEntity.currentStock.
   * Manufacturing code must not keep a second stock contract.
   */
  const manufacturingFiles =
    REQUIRED_PATHS.flatMap(
      (path) =>
        allTsFiles(
          resolve(
            process.cwd(),
            path,
          ),
        ),
    );

  for (
    const file of manufacturingFiles
  ) {
    if (
      file.endsWith('.spec.ts')
    ) {
      continue;
    }

    const content =
      readFileSync(
        file,
        'utf8',
      );

    if (
      /\b(stockQty|currentQty)\b/.test(
        content,
      )
    ) {
      findings.push({
        level: 'ERROR',
        file: relative(file),
        detail:
          'Legacy stock property detected. Manufacturing must use the canonical ItemEntity.currentStock contract.',
      });
    }

    if (
      content.includes(
        'manager.getRepository(ItemEntity)',
      ) ||
      content.includes(
        '@InjectRepository(ItemEntity)',
      )
    ) {
      if (
        !content.includes(
          'currentStock',
        )
      ) {
        findings.push({
          level: 'WARN',
          file: relative(file),
          detail:
            'This service accesses ItemEntity but does not reference currentStock. Verify stock mutations are intentional.',
        });
      }
    }
  }

  /*
   * Controller security gate.
   */
  const controllerFiles =
    manufacturingFiles.filter(
      (file) =>
        file.endsWith(
          '.controller.ts',
        ),
    );

  for (
    const file of controllerFiles
  ) {
    const content =
      readFileSync(
        file,
        'utf8',
      );

    const hasMutation =
      /@(Post|Patch|Put|Delete)\(/.test(
        content,
      );

    const hasGuard =
      content.includes(
        'JwtAuthGuard',
      ) &&
      content.includes(
        '@UseGuards',
      );

    if (
      hasMutation &&
      !hasGuard
    ) {
      findings.push({
        level: 'ERROR',
        file: relative(file),
        detail:
          'Manufacturing mutation routes are not protected by JwtAuthGuard.',
      });
    }
  }

  /*
   * Production-order lifecycle should expose an explicit completion path.
   */
  const productionController =
    resolve(
      process.cwd(),
      'src/production-orders/production-orders.controller.ts',
    );

  if (
    existsSync(
      productionController,
    )
  ) {
    const content =
      readFileSync(
        productionController,
        'utf8',
      );

    if (
      !/complete/i.test(
        content,
      )
    ) {
      findings.push({
        level: 'WARN',
        file:
          'src/production-orders/production-orders.controller.ts',
        detail:
          'No explicit production-completion route was detected. Verify how finished-goods completion is recorded.',
      });
    }
  }

  /*
   * Detect whether a dedicated manufacturing E2E already exists.
   */
  const e2eCandidates = [
    'test/manufacturing.e2e-spec.ts',
    'test/manufacturing-flow.e2e-spec.ts',
    'test/production-order.e2e-spec.ts',
  ];

  if (
    !e2eCandidates.some(
      (path) =>
        existsSync(
          resolve(
            process.cwd(),
            path,
          ),
        ),
    )
  ) {
    findings.push({
      level: 'WARN',
      file: 'test',
      detail:
        'No dedicated manufacturing end-to-end test was detected.',
    });
  }

  const errors =
    findings.filter(
      (finding) =>
        finding.level ===
        'ERROR',
    );

  const warnings =
    findings.filter(
      (finding) =>
        finding.level ===
        'WARN',
    );

  if (warnings.length) {
    console.log(
      `Manufacturing readiness warnings (${warnings.length}):`,
    );

    for (
      const warning of warnings
    ) {
      console.log(
        `- [${warning.file}] ${warning.detail}`,
      );
    }
  }

  if (errors.length) {
    console.error(
      `\nManufacturing readiness audit FAILED with ${errors.length} error(s):`,
    );

    for (
      const error of errors
    ) {
      console.error(
        `- [${error.file}] ${error.detail}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    '\nManufacturing readiness audit passed: no blocking structural or inventory-contract defects found.',
  );
}

main();
