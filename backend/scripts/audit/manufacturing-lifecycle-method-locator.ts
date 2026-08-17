import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';

const files = [
  'src/material-consumption/material-consumption.service.ts',
  'src/production-orders/production-orders.service.ts',
  'src/production-variance/production-variance.service.ts',
];

const output: unknown[] = [];

for (const file of files) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;

  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  source.forEachChild((node) => {
    if (!ts.isClassDeclaration(node)) return;

    const className = node.name?.text ?? 'AnonymousClass';

    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) continue;

      const text = member.getText(source);
      const line =
        source.getLineAndCharacterOfPosition(
          member.getStart(source),
        ).line + 1;

      const signals: string[] = [];

      if (/transaction\s*\(/i.test(text)) signals.push('transaction');
      if (/status/i.test(text)) signals.push('status');
      if (/currentStock|current_stock/i.test(text)) signals.push('stock');
      if (/save\s*\(/i.test(text)) signals.push('save');
      if (/consum|issue/i.test(text)) signals.push('consumption');
      if (/complete|finish|close/i.test(text)) signals.push('completion');
      if (/variance/i.test(text)) signals.push('variance');

      output.push({
        file,
        className,
        method: member.name?.getText(source) ?? 'anonymous',
        line,
        isAsync:
          member.modifiers?.some(
            (m) =>
              m.kind ===
              ts.SyntaxKind.AsyncKeyword,
          ) ?? false,
        signals,
      });
    }
  });
}

const outDir = resolve(process.cwd(), 'artifacts');
mkdirSync(outDir, { recursive: true });

writeFileSync(
  resolve(outDir, 'manufacturing-lifecycle-methods.json'),
  JSON.stringify(output, null, 2),
  'utf8',
);

console.log(
  `Manufacturing lifecycle method locator found ${output.length} method(s).`,
);
console.log('- artifacts/manufacturing-lifecycle-methods.json');
