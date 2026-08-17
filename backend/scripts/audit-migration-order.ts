import {
  readdirSync,
  readFileSync,
} from 'fs';
import {
  basename,
  join,
} from 'path';

interface MigrationInfo {
  timestamp: number;
  file: string;
  creates: Set<string>;
  references: Set<string>;
}

const directory =
  join(
    process.cwd(),
    'src',
    'database',
    'migrations',
  );

const files =
  readdirSync(directory)
    .filter(
      (file) =>
        /^\d{13}-.+\.ts$/.test(file),
    )
    .sort();

const migrations: MigrationInfo[] =
  files.map((file) => {
    const timestamp =
      Number(file.slice(0, 13));

    const source =
      readFileSync(
        join(directory, file),
        'utf8',
      );

    const creates =
      new Set<string>();

    const references =
      new Set<string>();

    for (
      const match of source.matchAll(
        /CREATE TABLE(?: IF NOT EXISTS)?\s+"([^"]+)"/gi,
      )
    ) {
      creates.add(match[1]);
    }

    for (
      const match of source.matchAll(
        /REFERENCES\s+"([^"]+)"/gi,
      )
    ) {
      references.add(match[1]);
    }

    return {
      timestamp,
      file,
      creates,
      references,
    };
  });

const firstCreator =
  new Map<
    string,
    MigrationInfo
  >();

for (
  const migration of migrations
) {
  for (
    const table of migration.creates
  ) {
    if (
      !firstCreator.has(table)
    ) {
      firstCreator.set(
        table,
        migration,
      );
    }
  }
}

const problems: string[] = [];

for (
  const migration of migrations
) {
  for (
    const referencedTable of
      migration.references
  ) {
    const creator =
      firstCreator.get(
        referencedTable,
      );

    if (
      creator &&
      creator.timestamp >
        migration.timestamp
    ) {
      problems.push(
        `${migration.file} references "${referencedTable}" before it is created by ${creator.file}`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(
    'Migration dependency-order audit FAILED.',
  );

  for (const problem of problems) {
    console.error(`- ${problem}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Migration dependency-order audit passed (${migrations.length} migration files checked).`,
  );
}
