import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  join,
  relative,
  resolve,
} from 'node:path';

interface Route {
  file: string;
  controller: string;
  method: string;
  path: string;
  handler: string;
  guarded: boolean;
}

const ROOTS = [
  'src/bill-of-materials',
  'src/production-orders',
  'src/material-consumption',
  'src/manufacturing-mrp',
  'src/production-variance',
  'src/costing-variance',
];

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const result: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      result.push(...walk(path));
    } else if (
      entry.endsWith('.controller.ts')
    ) {
      result.push(path);
    }
  }

  return result;
}

function normalize(value?: string): string {
  return value?.trim().replace(
    /^['"`]|['"`]$/g,
    '',
  ) ?? '';
}

function main(): void {
  const routes: Route[] = [];

  for (
    const file of ROOTS.flatMap(
      (root) =>
        walk(
          resolve(
            process.cwd(),
            root,
          ),
        ),
    )
  ) {
    const content =
      readFileSync(
        file,
        'utf8',
      );

    const controllerMatch =
      content.match(
        /@Controller\(([^)]*)\)/,
      );

    const controller =
      normalize(
        controllerMatch?.[1],
      );

    const guarded =
      content.includes(
        '@UseGuards',
      ) &&
      content.includes(
        'JwtAuthGuard',
      );

    const expression =
      /@(Get|Post|Patch|Put|Delete)\(([^)]*)\)[\s\S]{0,700}?\n\s*(?:async\s+)?([A-Za-z0-9_]+)\s*\(/g;

    let match:
      | RegExpExecArray
      | null;

    while (
      (match =
        expression.exec(
          content,
        ))
    ) {
      routes.push({
        file:
          relative(
            process.cwd(),
            file,
          ).replace(
            /\\/g,
            '/',
          ),
        controller,
        method:
          match[1].toUpperCase(),
        path:
          normalize(match[2]),
        handler: match[3],
        guarded,
      });
    }
  }

  console.log(
    'Manufacturing route map',
  );
  console.log(
    '=======================\n',
  );

  for (const route of routes) {
    const fullPath =
      [
        route.controller,
        route.path,
      ]
        .filter(Boolean)
        .join('/');

    console.log(
      `${route.method.padEnd(6)} /${fullPath.padEnd(52)} ${route.handler} ${route.guarded ? '[JWT]' : '[NO CLASS JWT]'}`,
    );
  }

  console.log(
    `\nDetected ${routes.length} manufacturing route(s).`,
  );
}

main();
