import {
  readdirSync,
  readFileSync,
  statSync,
} from 'fs';
import {
  extname,
  join,
} from 'path';

const excludedDirectories = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
]);

const ignoredBasenames = new Set([
  '.env.deploy.example',
  '.env.production.example',
  '.env.database.production.example',
  '.env.observability.example',
]);

const ignoredSuffixes = [
  '.spec.ts',
  '.test.ts',
  '.e2e-spec.ts',
];

const scannedExtensions = new Set([
  '.ts',
  '.js',
  '.json',
  '.yml',
  '.yaml',
  '.env',
]);

const detectors = [
  {
    name: 'private key',
    pattern:
      /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: 'AWS access key',
    pattern:
      /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'hardcoded JWT secret',
    pattern:
      /\bJWT_SECRET\s*[:=]\s*['"][^'"]{16,}['"]/i,
  },
  {
    name: 'hardcoded database password',
    pattern:
      /\b(DATABASE_PASSWORD|DB_PASSWORD)\s*[:=]\s*['"][^'"]+['"]/i,
  },
] as const;

function shouldIgnoreFile(
  name: string,
): boolean {
  if (ignoredBasenames.has(name)) {
    return true;
  }

  return ignoredSuffixes.some(
    (suffix) => name.endsWith(suffix),
  );
}

function walk(
  directory: string,
): string[] {
  const result: string[] = [];

  for (const name of readdirSync(directory)) {
    if (excludedDirectories.has(name)) {
      continue;
    }

    const fullPath =
      join(directory, name);

    const stat =
      statSync(fullPath);

    if (stat.isDirectory()) {
      result.push(
        ...walk(fullPath),
      );
      continue;
    }

    if (shouldIgnoreFile(name)) {
      continue;
    }

    const extension = extname(name);

    if (
      extension &&
      !scannedExtensions.has(extension)
    ) {
      continue;
    }

    result.push(fullPath);
  }

  return result;
}

const findings: string[] = [];

for (const root of ['src', 'scripts']) {
  let sourceFiles: string[] = [];

  try {
    sourceFiles = walk(root);
  } catch {
    continue;
  }

  for (const file of sourceFiles) {
    let lines: string[];

    try {
      lines =
        readFileSync(
          file,
          'utf8',
        ).split(/\r?\n/);
    } catch {
      continue;
    }

    lines.forEach(
      (line, index) => {
        for (const detector of detectors) {
          if (detector.pattern.test(line)) {
            findings.push(
              `${file}:${index + 1} (${detector.name})`,
            );
          }
        }
      },
    );
  }
}

if (findings.length > 0) {
  console.error(
    'Secret scan FAILED.',
  );

  for (const finding of findings) {
    console.error(`- ${finding}`);
  }

  console.error(
    'Remove real secrets from source-controlled production code and rotate exposed credentials.',
  );

  process.exitCode = 1;
} else {
  console.log(
    'Secret scan passed.',
  );
}
