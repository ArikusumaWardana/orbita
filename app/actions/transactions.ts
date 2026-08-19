"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { Category, CategoryRow, Pocket, PocketRow, LedgerTransaction, TransactionRow, TransactionType, pocketFromRow, transactionFromRow } from "@/lib/finance";

function cleanAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value > 999_999_999_999.99) throw new Error("Nominal harus lebih dari Rp0.");
  return Math.round(value * 100) / 100;
}

export async function createPocket(input: { name: string; startingBalance: number }): Promise<Pocket> {
  const { db, user } = await getAuthenticatedDatabase();
  const name = input.name.trim();
  if (!name || name.length > 100) throw new Error("Nama dompet harus berisi 1 sampai 100 karakter.");
  const startingBalance = Number(input.startingBalance);
  if (!Number.isFinite(startingBalance) || Math.abs(startingBalance) > 999_999_999_999.99) throw new Error("Saldo awal tidak valid.");
  const { data, error } = await db.from("pockets").insert({ user_id: user.id, name, starting_balance: startingBalance, currency: "IDR" }).select("id,name,starting_balance,currency").single();
  if (error || !data) {
    console.error("Create pocket gagal", error);
    throw new Error(error?.code === "23505" ? "Nama dompet sudah digunakan." : "Dompet belum dapat dibuat. Coba lagi.");
  }
  revalidatePath("/finance");
  return pocketFromRow(data as PocketRow);
}

export async function createCategory(input: { name: string; type: TransactionType }): Promise<Category> {
  const { db, user } = await getAuthenticatedDatabase();
  const name = input.name.trim();
  if (!name || name.length > 100) throw new Error("Nama kategori harus berisi 1 sampai 100 karakter.");
  if (input.type !== "income" && input.type !== "expense") throw new Error("Jenis kategori tidak valid.");
  const { data, error } = await db.from("categories").insert({ user_id: user.id, name, type: input.type, is_default: false }).select("id,name,type").single();
  if (error || !data) {
    console.error("Create category gagal", error);
    throw new Error(error?.code === "23505" ? "Nama kategori sudah digunakan untuk jenis ini." : "Kategori belum dapat dibuat. Coba lagi.");
  }
  revalidatePath("/finance");
  return data as CategoryRow;
}

export async function createTransaction(input: { pocketId: string; categoryId: string; type: TransactionType; amount: number; description: string; transactionDate: string }): Promise<LedgerTransaction> {
  const { db, user } = await getAuthenticatedDatabase();
  if (!/^[0-9a-f-]{36}$/i.test(input.pocketId) || !/^[0-9a-f-]{36}$/i.test(input.categoryId)) throw new Error("Dompet atau kategori tidak valid.");
  if (input.type !== "income" && input.type !== "expense") throw new Error("Jenis transaksi tidak valid.");
  const amount = cleanAmount(Number(input.amount));
  const description = input.description.trim();
  if (description.length > 1000) throw new Error("Catatan maksimal 1.000 karakter.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)) throw new Error("Tanggal transaksi tidak valid.");
  const [pocket, category] = await Promise.all([
    db.from("pockets").select("id").eq("id", input.pocketId).eq("user_id", user.id).maybeSingle(),
    db.from("categories").select("id,type").eq("id", input.categoryId).eq("user_id", user.id).eq("type", input.type).maybeSingle(),
  ]);
  if (pocket.error || !pocket.data) throw new Error("Dompet tidak ditemukan.");
  if (category.error || !category.data) throw new Error("Kategori tidak sesuai dengan jenis transaksi.");
  const { data, error } = await db.from("transactions").insert({ user_id: user.id, pocket_id: input.pocketId, category_id: input.categoryId, type: input.type, amount, description: description || null, transaction_date: input.transactionDate }).select("id,pocket_id,category_id,type,amount,description,transaction_date,created_at").single();
  if (error || !data) {
    console.error("Create transaction gagal", error);
    throw new Error("Transaksi belum dapat disimpan. Coba lagi.");
  }
  revalidatePath("/finance");
  return transactionFromRow(data as TransactionRow);
}

export async function deleteTransaction(id: string) {
  const { db, user } = await getAuthenticatedDatabase();
  const { error } = await db.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error("Transaksi belum dapat dihapus. Coba lagi.");
  revalidatePath("/finance");
}
