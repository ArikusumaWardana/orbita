"use server";

import { getAuthenticatedDatabase } from "@/lib/db/server";

const DEFAULT_CATEGORIES = [
  ["Gaji", "income"],
  ["Bonus", "income"],
  ["Hadiah", "income"],
  ["Makanan", "expense"],
  ["Transport", "expense"],
  ["Tagihan", "expense"],
  ["Belanja", "expense"],
] as const;

export async function ensureOnboarding() {
  const { db, user } = await getAuthenticatedDatabase();
  const [profile, pocket, categories] = await Promise.all([
    db.from("profiles").upsert({
      id: user.id,
      full_name: user.name ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" }),
    db.from("pockets").upsert({
      user_id: user.id,
      name: "Dompet Utama",
      starting_balance: 0,
      currency: "IDR",
    }, { onConflict: "user_id,name", ignoreDuplicates: true }),
    db.from("categories").upsert(
      DEFAULT_CATEGORIES.map(([name, type]) => ({
        user_id: user.id,
        name,
        type,
        is_default: true,
      })),
      { onConflict: "user_id,name,type", ignoreDuplicates: true },
    ),
  ]);

  const error = profile.error ?? pocket.error ?? categories.error;
  if (error) throw new Error("Data awal akun belum dapat disiapkan. Coba masuk kembali.");
}
