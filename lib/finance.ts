export type TransactionType = "income" | "expense";

export type Pocket = {
  id: string;
  name: string;
  startingBalance: number;
  currency: string;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
};

export type LedgerTransaction = {
  id: string;
  pocketId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  createdAt: string;
};

export type PocketRow = { id: string; name: string; starting_balance: string | number; currency: string };
export type CategoryRow = { id: string; name: string; type: TransactionType };
export type TransactionRow = { id: string; pocket_id: string; category_id: string | null; type: TransactionType; amount: string | number; description: string | null; transaction_date: string; created_at: string };

export const pocketFromRow = (row: PocketRow): Pocket => ({ id: row.id, name: row.name, startingBalance: Number(row.starting_balance), currency: row.currency });
export const transactionFromRow = (row: TransactionRow): LedgerTransaction => ({ id: row.id, pocketId: row.pocket_id, categoryId: row.category_id, type: row.type, amount: Number(row.amount), description: row.description ?? "", transactionDate: row.transaction_date, createdAt: row.created_at });
