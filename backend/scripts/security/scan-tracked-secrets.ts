import { spawnSync } from 'child_process';

interface Finding {
  file: string;
  line: number;
  rule: string;
  preview: string;
}

const findings: Finding[] = [];

const filesResult =
  spawnSync(
    'git',
    [
      'ls-files',
      '-z',
    ],
    {
      cwd: process.cwd(),
      encoding: 'buffer',
      windowsHide: true,
    },
  );

if (
  filesResult.error ||
  filesResult.status !== 0
) {
  fail(
    'Unable to list Git-tracked files.',
  );
}

const files =
  Buffer.from(
    filesResult.stdout ?? '',
  )
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter(
      (file) =>
        !shouldSkip(file),
    );

const patterns: Array<{
  rule: string;
  regex: RegExp;
}> = [
  {
    rule: 'private-key',
    regex:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    rule: 'jwt-secret-assignment',
    regex:
      /\bJWT_(?:REFRESH_)?SECRET\s*=\s*['"]?[^$<{\s][^'"\s]{12,}/i,
  },
  {
    rule: 'database-password-assignment',
    regex:
      /\bDATABASE_PASSWORD\s*=\s*['"]?[^$<{\s][^'"\s]{8,}/i,
  },
  {
    rule: 'platform-password-assignment',
    regex:
      /\bPLATFORM_ADMIN_PASSWORD\s*=\s*['"]?[^$<{\s][^'"\s]{8,}/i,
  },
  {
    rule: 'known-default-admin-password',
    regex:
      /Admin@123/,
  },
];

for (
  const file
  of files
) {
  const show =
    spawnSync(
      'git',
      [
        'show',
        `HEAD:${file}`,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        maxBuffer:
          8 * 1024 * 1024,
        windowsHide: true,
      },
    );

  if (
    show.status !== 0 ||
    !show.stdout
  ) {
    continue;
  }

  if (
    looksBinary(
      show.stdout,
    )
  ) {
    continue;
  }

  const lines =
    show.stdout.split(
      /\r?\n/,
    );

  lines.forEach(
    (line, index) => {
      for (
        const pattern
        of patterns
      ) {
        if (
          pattern.regex.test(
            line,
          )
        ) {
          findings.push({
            file,
            line:
              index + 1,
            rule:
              pattern.rule,
            preview:
              redact(line),
          });
        }
      }
    },
  );
}

if (
  findings.length > 0
) {
  console.error(
    '\nTallySync tracked-secret scan FAILED.',
  );

  for (
    const finding
    of findings
  ) {
    console.error(
      `${finding.file}:${finding.line} [${finding.rule}] ${finding.preview}`,
    );
  }

  process.exitCode = 1;
} else {
  console.log(
    '\nTallySync tracked-secret scan PASSED.',
  );
  console.log(
    `Scanned ${files.length} Git-tracked text files.`,
  );
}

function shouldSkip(
  file: string,
): boolean {
  const normalized =
    file.replace(
      /\\/g,
      '/',
    );

  return [
    'package-lock.json',
    'artifacts/',
    'coverage/',
    'dist/',
    'node_modules/',
  ].some(
    (value) =>
      normalized === value ||
      normalized.startsWith(
        value,
      ),
  );
}

function looksBinary(
  value: string,
): boolean {
  return value.includes(
    '\u0000',
  );
}

function redact(
  line: string,
): string {
  return line
    .replace(
      /(PASSWORD\s*[=:]\s*)\S+/gi,
      '$1[REDACTED]',
    )
    .replace(
      /(SECRET\s*[=:]\s*)\S+/gi,
      '$1[REDACTED]',
    )
    .slice(
      0,
      220,
    );
}

function fail(
  message: string,
): never {
  throw new Error(message);
}
