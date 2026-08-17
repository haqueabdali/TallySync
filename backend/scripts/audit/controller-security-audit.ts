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

const allow = new Set([
  'src/app.controller.ts',
  'src/health/health.controller.ts',
  'src/auth/auth.controller.ts',
]);

const findings: string[] = [];
for (const file of walk('src')) {
  const normalized = file.replace(/\\/g, '/');
  if (allow.has(normalized)) continue;
  const source = readFileSync(file, 'utf8');
  const hasMutation = /@(Post|Put|Patch|Delete)\s*\(/.test(source);
  const hasGuard = /@UseGuards\([^)]*(JwtAuthGuard|AuthGuard)[^)]*\)/.test(source);
  if (hasMutation && !hasGuard) {
    findings.push(`${normalized}: mutation routes detected without Jwt/Auth guard`);
  }
}

if (findings.length) {
  console.error('Controller security audit FAILED.');
  for (const f of findings) console.error(`- ${f}`);
  console.error('Review manually before changing intentionally-public controllers.');
  process.exitCode = 1;
} else {
  console.log('Controller security audit passed.');
}
