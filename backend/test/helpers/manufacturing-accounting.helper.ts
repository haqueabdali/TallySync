import {
  DataSource,
} from 'typeorm';

interface JournalLineRow {
  journalEntryId: string;
  sourceType: string;
  sourceId: string;
  status: string;
  accountId: string;
  debit: string | number;
  credit: string | number;
}

export interface SourceJournalSummary {
  sourceType: string;
  sourceId: string;
  journalCount: number;
  totalDebit: number;
  totalCredit: number;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
  }>;
}

function round(
  value: number,
): number {
  return Math.round(
    (value + Number.EPSILON) *
      100,
  ) / 100;
}

export async function getSourceJournalSummary(
  dataSource: DataSource,
  companyId: string,
  sourceType: string,
  sourceId: string,
): Promise<SourceJournalSummary> {
  const rows =
    await dataSource.query<
      JournalLineRow[]
    >(
      `
        SELECT
          entry.id AS "journalEntryId",
          entry.source_type AS "sourceType",
          entry.source_id AS "sourceId",
          entry.status AS "status",
          line.account_id AS "accountId",
          line.debit AS "debit",
          line.credit AS "credit"
        FROM journal_entries entry
        INNER JOIN journal_entry_lines line
          ON line.journal_entry_id = entry.id
        WHERE entry.company_id = $1
          AND entry.source_type = $2
          AND entry.source_id = $3
          AND entry.status = 'Posted'
        ORDER BY entry.created_at, line.id
      `,
      [
        companyId,
        sourceType,
        sourceId,
      ],
    );

  const journalIds =
    new Set(
      rows.map(
        (row) =>
          row.journalEntryId,
      ),
    );

  const lines =
    rows.map(
      (row) => ({
        accountId:
          row.accountId,
        debit:
          round(
            Number(
              row.debit ?? 0,
            ),
          ),
        credit:
          round(
            Number(
              row.credit ?? 0,
            ),
          ),
      }),
    );

  const totalDebit =
    round(
      lines.reduce(
        (sum, line) =>
          sum + line.debit,
        0,
      ),
    );

  const totalCredit =
    round(
      lines.reduce(
        (sum, line) =>
          sum + line.credit,
        0,
      ),
    );

  return {
    sourceType,
    sourceId,
    journalCount:
      journalIds.size,
    totalDebit,
    totalCredit,
    lines,
  };
}

export async function getAccountMovement(
  dataSource: DataSource,
  companyId: string,
  accountId: string,
  sourceTypes: string[],
): Promise<{
  debit: number;
  credit: number;
  netDebit: number;
}> {
  const rows =
    await dataSource.query<
      Array<{
        debit: string | number;
        credit: string | number;
      }>
    >(
      `
        SELECT
          COALESCE(SUM(line.debit), 0) AS debit,
          COALESCE(SUM(line.credit), 0) AS credit
        FROM journal_entry_lines line
        INNER JOIN journal_entries entry
          ON entry.id = line.journal_entry_id
        WHERE entry.company_id = $1
          AND line.account_id = $2
          AND entry.status = 'Posted'
          AND entry.source_type = ANY($3)
      `,
      [
        companyId,
        accountId,
        sourceTypes,
      ],
    );

  const debit =
    round(
      Number(
        rows[0]?.debit ?? 0,
      ),
    );

  const credit =
    round(
      Number(
        rows[0]?.credit ?? 0,
      ),
    );

  return {
    debit,
    credit,
    netDebit:
      round(
        debit - credit,
      ),
  };
}
