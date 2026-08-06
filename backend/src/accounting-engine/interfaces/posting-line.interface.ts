export interface PostingLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
  partyType?: string | null;
  partyId?: string | null;
  costCenter?: string | null;
}
