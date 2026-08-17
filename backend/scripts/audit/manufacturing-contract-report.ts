import 'dotenv/config';

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

interface ControllerRoute {
  file: string;
  controller: string;
  method: string;
  path: string;
  handler: string;
  guards: string[];
  roles: string[];
  parameters: Array<{
    name: string;
    type: string;
    decorators: string[];
  }>;
}

interface DtoClass {
  file: string;
  className: string;
  properties: Array<{
    name: string;
    type: string;
    optional: boolean;
    decorators: string[];
  }>;
}

interface EnumContract {
  file: string;
  enumName: string;
  members: Array<{
    name: string;
    value: string;
  }>;
}

interface EntityContract {
  file: string;
  className: string;
  table: string | null;
  columns: Array<{
    property: string;
    databaseName: string | null;
    type: string;
    nullable: boolean | null;
    defaultValue: string | null;
  }>;
}

interface ServiceSignal {
  file: string;
  className: string;
  methods: Array<{
    name: string;
    async: boolean;
    transactionSignal: boolean;
    currentStockSignal: boolean;
    stockMutationSignal: boolean;
    rowLockSignal: boolean;
    completionSignal: boolean;
    consumptionSignal: boolean;
    statusSignal: boolean;
  }>;
}

interface DbColumn {
  table_name: string;
  column_name: string;
  is_nullable: string;
  data_type: string;
  udt_name: string;
  column_default: string | null;
}

interface DbTable {
  table: string;
  columns: DbColumn[];
}

interface Report {
  generatedAt: string;
  sourceRoots: string[];
  controllers: ControllerRoute[];
  dtos: DtoClass[];
  enums: EnumContract[];
  entities: EntityContract[];
  services: ServiceSignal[];
  database: {
    name: string;
    tables: DbTable[];
    itemStockColumns: DbColumn[];
  };
  findings: Array<{
    severity: 'ERROR' | 'WARN' | 'INFO';
    area: string;
    detail: string;
  }>;
}

const SOURCE_ROOTS = [
  'src/bill-of-materials',
  'src/production-orders',
  'src/material-consumption',
  'src/manufacturing-mrp',
  'src/production-variance',
  'src/costing-variance',
  'src/production-scheduling',
  'src/capacity-planning',
  'src/quality-management',
];

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const output: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      output.push(...walk(path));
      continue;
    }

    if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts')
    ) {
      output.push(path);
    }
  }

  return output;
}

function rel(path: string): string {
  return relative(
    process.cwd(),
    path,
  ).replace(/\\/g, '/');
}

function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
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
    ts.getDecorators(node) ?? []
  );
}

function decoratorText(
  decorator: ts.Decorator,
): string {
  return decorator.expression
    .getText()
    .replace(/\s+/g, ' ');
}

function decoratorName(
  decorator: ts.Decorator,
): string {
  const expression =
    decorator.expression;

  if (
    ts.isCallExpression(expression)
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
    !ts.isCallExpression(expression)
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

function classDecorator(
  node: ts.ClassDeclaration,
  name: string,
): ts.Decorator | undefined {
  return decoratorsOf(node).find(
    (decorator) =>
      decoratorName(
        decorator,
      ) === name,
  );
}

function parseControllers(
  files: string[],
): ControllerRoute[] {
  const routes: ControllerRoute[] = [];

  for (const file of files) {
    if (
      !file.endsWith(
        '.controller.ts',
      )
    ) {
      continue;
    }

    const sf =
      sourceFile(file);

    sf.forEachChild((node) => {
      if (
        !ts.isClassDeclaration(node) ||
        !node.name
      ) {
        return;
      }

      const controllerDecorator =
        classDecorator(
          node,
          'Controller',
        );

      if (!controllerDecorator) {
        return;
      }

      const prefix =
        decoratorArg(
          controllerDecorator,
        );

      const classGuards =
        decoratorsOf(node)
          .filter(
            (decorator) =>
              decoratorName(
                decorator,
              ) === 'UseGuards',
          )
          .map(
            decoratorText,
          );

      const classRoles =
        decoratorsOf(node)
          .filter(
            (decorator) =>
              decoratorName(
                decorator,
              ) === 'Roles',
          )
          .map(
            decoratorText,
          );

      for (
        const member of node.members
      ) {
        if (
          !ts.isMethodDeclaration(
            member,
          ) ||
          !member.name
        ) {
          continue;
        }

        const routeDecorator =
          decoratorsOf(member).find(
            (decorator) =>
              [
                'Get',
                'Post',
                'Patch',
                'Put',
                'Delete',
              ].includes(
                decoratorName(
                  decorator,
                ),
              ),
          );

        if (!routeDecorator) {
          continue;
        }

        const guards = [
          ...classGuards,
          ...decoratorsOf(member)
            .filter(
              (decorator) =>
                decoratorName(
                  decorator,
                ) === 'UseGuards',
            )
            .map(
              decoratorText,
            ),
        ];

        const roles = [
          ...classRoles,
          ...decoratorsOf(member)
            .filter(
              (decorator) =>
                decoratorName(
                  decorator,
                ) === 'Roles',
            )
            .map(
              decoratorText,
            ),
        ];

        routes.push({
          file: rel(file),
          controller: prefix,
          method:
            decoratorName(
              routeDecorator,
            ).toUpperCase(),
          path:
            decoratorArg(
              routeDecorator,
            ),
          handler:
            member.name.getText(),
          guards,
          roles,
          parameters:
            member.parameters.map(
              (parameter) => ({
                name:
                  parameter.name.getText(),
                type:
                  parameter.type?.getText() ??
                  'unknown',
                decorators:
                  decoratorsOf(
                    parameter,
                  ).map(
                    decoratorText,
                  ),
              }),
            ),
        });
      }
    });
  }

  return routes;
}

function parseDtos(
  files: string[],
): DtoClass[] {
  const output: DtoClass[] = [];

  for (const file of files) {
    if (
      !file.includes(
        `${join('', 'dto')}`,
      ) &&
      !file.replace(/\\/g, '/')
        .includes('/dto/')
    ) {
      continue;
    }

    const sf =
      sourceFile(file);

    sf.forEachChild((node) => {
      if (
        !ts.isClassDeclaration(node) ||
        !node.name
      ) {
        return;
      }

      const properties =
        node.members
          .filter(
            ts.isPropertyDeclaration,
          )
          .map(
            (property) => ({
              name:
                property.name.getText(),
              type:
                property.type?.getText() ??
                'unknown',
              optional:
                Boolean(
                  property.questionToken,
                ),
              decorators:
                decoratorsOf(
                  property,
                ).map(
                  decoratorText,
                ),
            }),
          );

      if (properties.length) {
        output.push({
          file: rel(file),
          className:
            node.name.text,
          properties,
        });
      }
    });
  }

  return output;
}

function parseEnums(
  files: string[],
): EnumContract[] {
  const output: EnumContract[] = [];

  for (const file of files) {
    const sf =
      sourceFile(file);

    sf.forEachChild((node) => {
      if (
        !ts.isEnumDeclaration(
          node,
        )
      ) {
        return;
      }

      output.push({
        file: rel(file),
        enumName:
          node.name.text,
        members:
          node.members.map(
            (member) => ({
              name:
                member.name.getText(),
              value:
                member.initializer
                  ?.getText()
                  .replace(
                    /^['"`]|['"`]$/g,
                    '',
                  ) ??
                member.name.getText(),
            }),
          ),
      });
    });
  }

  return output;
}

function parseEntities(
  files: string[],
): EntityContract[] {
  const output: EntityContract[] = [];

  for (const file of files) {
    if (
      !file.endsWith(
        '.entity.ts',
      )
    ) {
      continue;
    }

    const sf =
      sourceFile(file);

    sf.forEachChild((node) => {
      if (
        !ts.isClassDeclaration(node) ||
        !node.name
      ) {
        return;
      }

      const entityDecorator =
        classDecorator(
          node,
          'Entity',
        );

      if (!entityDecorator) {
        return;
      }

      const columns:
        EntityContract['columns'] =
        [];

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
          decoratorText(
            columnDecorator,
          );

        const nameMatch =
          raw.match(
            /name\s*:\s*['"`]([^'"`]+)['"`]/,
          );

        const nullableMatch =
          raw.match(
            /nullable\s*:\s*(true|false)/,
          );

        const defaultMatch =
          raw.match(
            /default\s*:\s*([^,}]+)/,
          );

        columns.push({
          property:
            member.name.getText(),
          databaseName:
            nameMatch?.[1] ??
            null,
          type:
            member.type?.getText() ??
            'unknown',
          nullable:
            nullableMatch
              ? nullableMatch[1] ===
                'true'
              : null,
          defaultValue:
            defaultMatch?.[1]
              ?.trim() ?? null,
        });
      }

      output.push({
        file: rel(file),
        className:
          node.name.text,
        table:
          decoratorArg(
            entityDecorator,
          ) || null,
        columns,
      });
    });
  }

  return output;
}

function parseServices(
  files: string[],
): ServiceSignal[] {
  const output: ServiceSignal[] =
    [];

  for (const file of files) {
    if (
      !file.endsWith(
        '.service.ts',
      )
    ) {
      continue;
    }

    const sf =
      sourceFile(file);

    sf.forEachChild((node) => {
      if (
        !ts.isClassDeclaration(node) ||
        !node.name
      ) {
        return;
      }

      const methods:
        ServiceSignal['methods'] =
        [];

      for (
        const member of node.members
      ) {
        if (
          !ts.isMethodDeclaration(
            member,
          ) ||
          !member.name
        ) {
          continue;
        }

        const text =
          member.getText();

        methods.push({
          name:
            member.name.getText(),
          async:
            Boolean(
              member.modifiers?.some(
                (modifier) =>
                  modifier.kind ===
                  ts.SyntaxKind
                    .AsyncKeyword,
              ),
            ),
          transactionSignal:
            /transaction\s*\(/.test(
              text,
            ),
          currentStockSignal:
            /\bcurrentStock\b/.test(
              text,
            ),
          stockMutationSignal:
            /currentStock\s*(?:=|\+=|-=)|current_stock\s*=/.test(
              text,
            ),
          rowLockSignal:
            /pessimistic_write|setLock|affected\s*===?\s*1|current_stock\s*>?=/.test(
              text,
            ),
          completionSignal:
            /complete|completed|finish|finished.?goods/i.test(
              text,
            ),
          consumptionSignal:
            /consum|issue.?material/i.test(
              text,
            ),
          statusSignal:
            /\.status\b|status\s*=/.test(
              text,
            ),
        });
      }

      output.push({
        file: rel(file),
        className:
          node.name.text,
        methods,
      });
    });
  }

  return output;
}

async function databaseReport(): Promise<
  Report['database']
> {
  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_db';

  process.env.DATABASE_NAME =
    databaseName;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } =
    require(
      '../../src/database/data-source',
    ) as {
      default:
        import('typeorm').DataSource;
    };

  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const tableRows =
      await dataSource.query<
        Array<{
          table_name: string;
        }>
      >(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND (
            table_name ILIKE '%bill%material%'
            OR table_name ILIKE '%production%'
            OR table_name ILIKE '%material%consumption%'
            OR table_name ILIKE '%work%center%'
          )
        ORDER BY table_name
      `);

    const tables: DbTable[] = [];

    for (
      const table of tableRows
    ) {
      const columns =
        await dataSource.query<
          DbColumn[]
        >(
          `
            SELECT
              table_name,
              column_name,
              is_nullable,
              data_type,
              udt_name,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
            ORDER BY ordinal_position
          `,
          [table.table_name],
        );

      tables.push({
        table:
          table.table_name,
        columns,
      });
    }

    const itemStockColumns =
      await dataSource.query<
        DbColumn[]
      >(`
        SELECT
          table_name,
          column_name,
          is_nullable,
          data_type,
          udt_name,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'items'
          AND (
            column_name ILIKE '%stock%'
            OR column_name ILIKE '%on_hand%'
            OR column_name ILIKE '%quantity%'
          )
        ORDER BY ordinal_position
      `);

    return {
      name: databaseName,
      tables,
      itemStockColumns,
    };
  } finally {
    if (
      dataSource.isInitialized
    ) {
      await dataSource.destroy();
    }
  }
}

function makeFindings(
  report: Omit<
    Report,
    'findings'
  >,
): Report['findings'] {
  const findings:
    Report['findings'] = [];

  const mutatingRoutes =
    report.controllers.filter(
      (route) =>
        [
          'POST',
          'PATCH',
          'PUT',
          'DELETE',
        ].includes(route.method),
    );

  for (
    const route of mutatingRoutes
  ) {
    if (
      !route.guards.some(
        (guard) =>
          guard.includes(
            'JwtAuthGuard',
          ),
      )
    ) {
      findings.push({
        severity: 'WARN',
        area: route.file,
        detail:
          `${route.method} ${route.controller}/${route.path} has no JwtAuthGuard visible in controller metadata.`,
      });
    }
  }

  const stockMethods =
    report.services.flatMap(
      (service) =>
        service.methods
          .filter(
            (method) =>
              method.stockMutationSignal,
          )
          .map(
            (method) => ({
              service,
              method,
            }),
          ),
    );

  for (
    const entry of stockMethods
  ) {
    if (
      !entry.method
        .transactionSignal
    ) {
      findings.push({
        severity: 'ERROR',
        area:
          entry.service.file,
        detail:
          `${entry.service.className}.${entry.method.name} mutates stock without an obvious local transaction signal.`,
      });
    }

    if (
      !entry.method
        .rowLockSignal
    ) {
      findings.push({
        severity: 'WARN',
        area:
          entry.service.file,
        detail:
          `${entry.service.className}.${entry.method.name} mutates stock without an obvious row-lock/atomic-update signal.`,
      });
    }
  }

  if (
    !report.database
      .itemStockColumns.some(
        (column) =>
          column.column_name ===
          'current_stock',
      )
  ) {
    findings.push({
      severity: 'ERROR',
      area: 'database',
      detail:
        'items.current_stock is missing.',
    });
  }

  const completionRoutes =
    report.controllers.filter(
      (route) =>
        /complete|finish/i.test(
          `${route.path} ${route.handler}`,
        ),
    );

  if (
    !completionRoutes.length
  ) {
    findings.push({
      severity: 'WARN',
      area: 'production-orders',
      detail:
        'No explicit completion/finished-goods route was detected.',
    });
  }

  const consumptionRoutes =
    report.controllers.filter(
      (route) =>
        /consum|issue/i.test(
          `${route.controller} ${route.path} ${route.handler}`,
        ),
    );

  if (
    !consumptionRoutes.length
  ) {
    findings.push({
      severity: 'WARN',
      area: 'material-consumption',
      detail:
        'No material-consumption mutation route was detected.',
    });
  }

  findings.push({
    severity: 'INFO',
    area: 'summary',
    detail:
      `${report.controllers.length} routes, ${report.dtos.length} DTO classes, ${report.entities.length} entities, ${report.enums.length} enums, ${report.services.length} services analyzed.`,
  });

  return findings;
}

function markdown(
  report: Report,
): string {
  const lines: string[] = [];

  lines.push(
    '# Manufacturing Contract Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Database: ${report.database.name}`,
    '',
    '## Routes',
    '',
    '| Method | Route | Handler | Guards | Roles |',
    '|---|---|---|---|---|',
  );

  for (
    const route of report.controllers
  ) {
    const path =
      [
        route.controller,
        route.path,
      ]
        .filter(Boolean)
        .join('/');

    lines.push(
      `| ${route.method} | /${path} | ${route.handler} | ${route.guards.join('<br>')} | ${route.roles.join('<br>')} |`,
    );
  }

  lines.push(
    '',
    '## DTOs',
    '',
  );

  for (const dto of report.dtos) {
    lines.push(
      `### ${dto.className}`,
      '',
      `File: \`${dto.file}\``,
      '',
    );

    for (
      const property of
        dto.properties
    ) {
      lines.push(
        `- \`${property.name}${property.optional ? '?' : ''}: ${property.type}\``,
      );
    }

    lines.push('');
  }

  lines.push(
    '## Entities',
    '',
  );

  for (
    const entity of report.entities
  ) {
    lines.push(
      `### ${entity.className}`,
      '',
      `Table: \`${entity.table ?? '(implicit)'}\``,
      '',
    );

    for (
      const column of
        entity.columns
    ) {
      lines.push(
        `- \`${column.property}: ${column.type}\` → \`${column.databaseName ?? '(implicit name)'}\``,
      );
    }

    lines.push('');
  }

  lines.push(
    '## Status / domain enums',
    '',
  );

  for (const item of report.enums) {
    lines.push(
      `### ${item.enumName}`,
      '',
      ...item.members.map(
        (member) =>
          `- \`${member.name} = ${member.value}\``,
      ),
      '',
    );
  }

  lines.push(
    '## Service integrity signals',
    '',
  );

  for (
    const service of report.services
  ) {
    const interesting =
      service.methods.filter(
        (method) =>
          method.transactionSignal ||
          method.stockMutationSignal ||
          method.completionSignal ||
          method.consumptionSignal,
      );

    if (!interesting.length) {
      continue;
    }

    lines.push(
      `### ${service.className}`,
      '',
    );

    for (
      const method of interesting
    ) {
      lines.push(
        `- \`${method.name}\`: transaction=${method.transactionSignal}, stockMutation=${method.stockMutationSignal}, lock=${method.rowLockSignal}, completion=${method.completionSignal}, consumption=${method.consumptionSignal}`,
      );
    }

    lines.push('');
  }

  lines.push(
    '## DB manufacturing tables',
    '',
  );

  for (
    const table of
      report.database.tables
  ) {
    lines.push(
      `### ${table.table}`,
      '',
    );

    for (
      const column of
        table.columns
    ) {
      lines.push(
        `- \`${column.column_name}\` — ${column.data_type}, nullable=${column.is_nullable}`,
      );
    }

    lines.push('');
  }

  lines.push(
    '## Findings',
    '',
  );

  for (
    const finding of
      report.findings
  ) {
    lines.push(
      `- **${finding.severity}** [${finding.area}] ${finding.detail}`,
    );
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const files =
    SOURCE_ROOTS.flatMap(
      (root) =>
        walk(
          resolve(
            process.cwd(),
            root,
          ),
        ),
    );

  const base = {
    generatedAt:
      new Date().toISOString(),
    sourceRoots:
      SOURCE_ROOTS,
    controllers:
      parseControllers(files),
    dtos:
      parseDtos(files),
    enums:
      parseEnums(files),
    entities:
      parseEntities(files),
    services:
      parseServices(files),
    database:
      await databaseReport(),
  };

  const report: Report = {
    ...base,
    findings:
      makeFindings(base),
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

  const jsonPath =
    join(
      directory,
      'manufacturing-contract-report.json',
    );

  const markdownPath =
    join(
      directory,
      'manufacturing-contract-report.md',
    );

  writeFileSync(
    jsonPath,
    JSON.stringify(
      report,
      null,
      2,
    ),
    'utf8',
  );

  writeFileSync(
    markdownPath,
    markdown(report),
    'utf8',
  );

  console.log(
    `Manufacturing contract report generated:\n- ${relative(process.cwd(), jsonPath)}\n- ${relative(process.cwd(), markdownPath)}`,
  );

  const errors =
    report.findings.filter(
      (finding) =>
        finding.severity ===
        'ERROR',
    );

  const warnings =
    report.findings.filter(
      (finding) =>
        finding.severity ===
        'WARN',
    );

  console.log(
    `\nRoutes: ${report.controllers.length}`,
  );
  console.log(
    `DTOs: ${report.dtos.length}`,
  );
  console.log(
    `Entities: ${report.entities.length}`,
  );
  console.log(
    `Enums: ${report.enums.length}`,
  );
  console.log(
    `Services: ${report.services.length}`,
  );
  console.log(
    `Warnings: ${warnings.length}`,
  );
  console.log(
    `Blocking errors: ${errors.length}`,
  );

  if (errors.length) {
    process.exitCode = 1;
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.stack ??
          error.message
        : 'Manufacturing contract report failed.',
    );
    process.exitCode = 1;
  },
);
