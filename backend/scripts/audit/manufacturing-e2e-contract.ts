import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  basename,
  resolve,
} from 'node:path';

import * as ts from 'typescript';

interface MethodContract {
  name: string;
  line: number;
  parameters: string[];
  returnType: string | null;
}

interface FileContract {
  file: string;
  kind: string;
  exists: boolean;
  methods?: MethodContract[];
  decorators?: string[];
  fields?: string[];
}

const files = [
  {
    file:
      'src/production-orders/production-orders.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/production-orders/production-orders.service.ts',
    kind:
      'service',
  },
  {
    file:
      'src/production-orders/dto/create-production-order.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/material-consumption/material-consumption.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/material-consumption/material-consumption.service.ts',
    kind:
      'service',
  },
  {
    file:
      'src/material-consumption/dto/create-material-consumption.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/production-variance/production-variance.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/production-variance/production-variance.service.ts',
    kind:
      'service',
  },
  {
    file:
      'src/production-variance/dto/calculate-production-variance.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/bill-of-materials/bill-of-materials.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/bill-of-materials/dto/create-bill-of-material.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/accounts/accounts.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/accounts/dto/create-account.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/accounting-settings/accounting-settings.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/accounting-settings/dto/update-accounting-settings.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/items/items.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/items/dto/create-item.dto.ts',
    kind:
      'dto',
  },
  {
    file:
      'src/warehouses/warehouses.controller.ts',
    kind:
      'controller',
  },
  {
    file:
      'src/warehouses/dto/create-warehouse.dto.ts',
    kind:
      'dto',
  },
];

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

function decoratorsOf(
  node: ts.Node,
  source: ts.SourceFile,
): string[] {
  const decorators =
    ts.canHaveDecorators(node)
      ? ts.getDecorators(node)
      : undefined;

  return (
    decorators?.map(
      (decorator) =>
        decorator.getText(source),
    ) ?? []
  );
}

function methodsOf(
  source: ts.SourceFile,
): MethodContract[] {
  const methods: MethodContract[] = [];

  source.forEachChild((node) => {
    if (
      !ts.isClassDeclaration(node)
    ) {
      return;
    }

    for (
      const member of
        node.members
    ) {
      if (
        !ts.isMethodDeclaration(
          member,
        )
      ) {
        continue;
      }

      methods.push({
        name:
          member.name?.getText(
            source,
          ) ?? '',
        line:
          lineOf(
            source,
            member,
          ),
        parameters:
          member.parameters.map(
            (parameter) =>
              parameter.getText(
                source,
              ),
          ),
        returnType:
          member.type?.getText(
            source,
          ) ?? null,
      });
    }
  });

  return methods;
}

function classDecoratorsOf(
  source: ts.SourceFile,
): string[] {
  const result: string[] = [];

  source.forEachChild((node) => {
    if (
      ts.isClassDeclaration(node)
    ) {
      result.push(
        ...decoratorsOf(
          node,
          source,
        ),
      );

      for (
        const member of
          node.members
      ) {
        if (
          ts.isMethodDeclaration(
            member,
          )
        ) {
          const name =
            member.name?.getText(
              source,
            ) ?? '';

          for (
            const decorator of
              decoratorsOf(
                member,
                source,
              )
          ) {
            result.push(
              `${name}: ${decorator}`,
            );
          }
        }
      }
    }
  });

  return result;
}

function dtoFieldsOf(
  source: ts.SourceFile,
): string[] {
  const fields: string[] = [];

  source.forEachChild((node) => {
    if (
      !ts.isClassDeclaration(node)
    ) {
      return;
    }

    for (
      const member of
        node.members
    ) {
      if (
        !ts.isPropertyDeclaration(
          member,
        )
      ) {
        continue;
      }

      fields.push(
        member.getText(source),
      );
    }
  });

  return fields;
}

const contracts:
  FileContract[] = [];

for (
  const target of files
) {
  const path =
    resolve(
      process.cwd(),
      target.file,
    );

  if (
    !existsSync(path)
  ) {
    contracts.push({
      file:
        target.file,
      kind:
        target.kind,
      exists:
        false,
    });

    continue;
  }

  const content =
    readFileSync(
      path,
      'utf8',
    );

  const source =
    ts.createSourceFile(
      path,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

  const contract:
    FileContract = {
      file:
        target.file,
      kind:
        target.kind,
      exists:
        true,
    };

  if (
    target.kind ===
      'controller'
  ) {
    contract.methods =
      methodsOf(source);

    contract.decorators =
      classDecoratorsOf(
        source,
      );
  }

  if (
    target.kind ===
      'service'
  ) {
    contract.methods =
      methodsOf(source);
  }

  if (
    target.kind ===
      'dto'
  ) {
    contract.fields =
      dtoFieldsOf(source);
  }

  contracts.push(
    contract,
  );
}

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
    'manufacturing-e2e-contract.json',
  ),
  JSON.stringify(
    contracts,
    null,
    2,
  ),
  'utf8',
);

const markdown: string[] = [
  '# Manufacturing E2E Live Contract',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
];

for (
  const contract of
    contracts
) {
  markdown.push(
    `## ${basename(contract.file)}`,
    '',
    `Path: \`${contract.file}\``,
    '',
    `Kind: ${contract.kind}`,
    '',
    `Exists: ${contract.exists}`,
    '',
  );

  if (
    contract.decorators?.length
  ) {
    markdown.push(
      '### Decorators / routes',
      '',
      '```text',
      ...contract.decorators,
      '```',
      '',
    );
  }

  if (
    contract.methods?.length
  ) {
    markdown.push(
      '### Methods',
      '',
    );

    for (
      const method of
        contract.methods
    ) {
      markdown.push(
        `- \`${method.name}(${method.parameters.join(', ')})\` — line ${method.line}${method.returnType ? ` — returns \`${method.returnType}\`` : ''}`,
      );
    }

    markdown.push('');
  }

  if (
    contract.fields?.length
  ) {
    markdown.push(
      '### DTO fields',
      '',
      '```ts',
      ...contract.fields,
      '```',
      '',
    );
  }
}

writeFileSync(
  resolve(
    outDir,
    'manufacturing-e2e-contract.md',
  ),
  markdown.join('\n'),
  'utf8',
);

const missing =
  contracts.filter(
    (contract) =>
      !contract.exists,
  );

console.log(
  `Manufacturing E2E contract extracted: files=${contracts.length}, missing=${missing.length}`,
);

console.log(
  '- artifacts/manufacturing-e2e-contract.json',
);

console.log(
  '- artifacts/manufacturing-e2e-contract.md',
);

if (
  missing.length
) {
  console.log(
    '\nMissing optional/expected files:',
  );

  for (
    const contract of
      missing
  ) {
    console.log(
      `- ${contract.file}`,
    );
  }
}
