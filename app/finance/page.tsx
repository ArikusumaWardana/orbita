import { ensureOnboarding } from "@/app/actions/onboarding";
import { FinanceWorkspace } from "@/components/finance-workspace";
import { auth } from "@/lib/auth/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { CategoryRow, PocketRow, TransactionRow, pocketFromRow, transactionFromRow } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { data: session } = await auth.getSession();
  await ensureOnboarding();
  const { db, user } = await getAuthenticatedDatabase();
  const [pockets, categories, transactions] = await Promise.all([
    db.from("pockets").select("id,name,starting_balance,currency").eq("user_id", user.id).order("created_at"),
    db.from("categories").select("id,name,type").eq("user_id", user.id).order("name"),
    db.from("transactions").select("id,pocket_id,category_id,type,amount,description,transaction_date,created_at").eq("user_id", user.id).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (pockets.error || categories.error || transactions.error) throw new Error("Data keuangan belum dapat dimuat. Coba muat ulang halaman.");
  return <FinanceWorkspace initialPockets={(pockets.data as PocketRow[]).map(pocketFromRow)} initialCategories={categories.data as CategoryRow[]} initialTransactions={(transactions.data as TransactionRow[]).map(transactionFromRow)} userName={session?.user?.name ?? "Pengguna"} />;
}
