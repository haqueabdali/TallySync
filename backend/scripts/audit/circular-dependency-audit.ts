import madge from 'madge';

async function main(): Promise<void> {
  const result = await madge('src', {
    fileExtensions: ['ts'],
    tsConfig: 'tsconfig.json',
  });

  const cycles = result.circular();

  const normalize = (file: string): string =>
    file.replace(/\\/g, '/');

  const isEntityFile = (file: string): boolean =>
    /(^|\/)entities\/[^/]+\.entity\.ts$/i.test(
      normalize(file),
    );

  const entityOnlyCycles = cycles.filter(
    (cycle) =>
      cycle.length > 0 &&
      cycle.every(isEntityFile),
  );

  const architecturalCycles = cycles.filter(
    (cycle) =>
      !(cycle.length > 0 && cycle.every(isEntityFile)),
  );

  console.log(`Madge found ${cycles.length} total cycle(s).`);

  if (entityOnlyCycles.length > 0) {
    console.log(
      `${entityOnlyCycles.length} cycle(s) are entity-only ORM relationship cycles and are informational.`,
    );
  }

  if (architecturalCycles.length > 0) {
    console.error(
      `Circular dependency audit FAILED: ${architecturalCycles.length} architectural cycle(s) remain.`,
    );

    architecturalCycles.forEach((cycle, index) => {
      console.error(`${index + 1}. ${cycle.join(' > ')}`);
    });

    process.exitCode = 1;
    return;
  }

  console.log(
    'Circular dependency audit passed: no non-entity architectural cycles found.',
  );
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Circular dependency audit failed unexpectedly.',
  );
  process.exitCode = 1;
});
