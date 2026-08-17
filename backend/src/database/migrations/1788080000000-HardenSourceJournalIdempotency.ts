import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class HardenSourceJournalIdempotency1788080000000
  implements MigrationInterface
{
  name =
    'HardenSourceJournalIdempotency1788080000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * AccountingEngineService already checks for an existing journal using:
     *
     *   company_id + source_type + source_id
     *
     * That protects sequential retries, but without a UNIQUE index two
     * concurrent requests can both pass the application-level lookup.
     *
     * Never silently delete accounting entries. If duplicates already exist,
     * stop the migration and make the data issue explicit.
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        duplicate_count integer;
      BEGIN
        SELECT COUNT(*)
        INTO duplicate_count
        FROM (
          SELECT
            company_id,
            source_type,
            source_id
          FROM journal_entries
          WHERE
            source_id IS NOT NULL
            AND deleted_at IS NULL
          GROUP BY
            company_id,
            source_type,
            source_id
          HAVING COUNT(*) > 1
        ) duplicates;

        IF duplicate_count > 0 THEN
          RAISE EXCEPTION
            'Cannot enforce source journal idempotency: % duplicate source group(s) already exist',
            duplicate_count;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_journal_entries_live_source"
      ON "journal_entries" (
        "company_id",
        "source_type",
        "source_id"
      )
      WHERE
        "source_id" IS NOT NULL
        AND "deleted_at" IS NULL
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_journal_entries_live_source"
    `);
  }
}
