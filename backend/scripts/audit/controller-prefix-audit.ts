import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

const problems: string[] = [];
const pattern = /@Controller\(\s*['"`]\/?api\/v1(?:\/[^'"`]*)?['"`]\s*\)/g;

for (const file of walk('src')) {
  const source = readFileSync(file, 'utf8');
  const matches = source.match(pattern);
  for (const match of matches ?? []) problems.push(`${file}: ${match}`);
}

if (problems.length) {
  console.error('Controller prefix audit FAILED.');
  console.error('main.ts owns the global api/v1 prefix.');
  for (const p of problems) console.error(`- ${p}`);
  process.exitCode = 1;
} else {
  console.log('Controller prefix audit passed.');
}
