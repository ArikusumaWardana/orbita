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
  const [profileLookup, pocketLookup, categoryLookup] = await Promise.all([
    db.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    db.from("pockets").select("id").eq("user_id", user.id).eq("name", "Dompet Utama").maybeSingle(),
    db.from("categories").select("name,type").eq("user_id", user.id).eq("is_default", true),
  ]);

  const lookupFailures = [
    ["profile_lookup", profileLookup.error],
    ["pocket_lookup", pocketLookup.error],
    ["category_lookup", categoryLookup.error],
  ].filter((entry) => entry[1]);

  if (lookupFailures.length > 0) {
    reportFailures(lookupFailures);
    throw new Error("Data awal akun belum dapat diperiksa. Coba masuk kembali.");
  }

  const existingCategories = new Set(
    (categoryLookup.data ?? []).map((category) => `${category.name}:${category.type}`),
  );
  const missingCategories = DEFAULT_CATEGORIES.filter(
    ([name, type]) => !existingCategories.has(`${name}:${type}`),
  );

  const writes: Array<PromiseLike<{ error: unknown }> | null> = [
    profileLookup.data ? null : db.from("profiles").upsert({
      id: user.id,
      full_name: user.name ?? null,
    }, { onConflict: "id", ignoreDuplicates: true }),
    pocketLookup.data ? null : db.from("pockets").upsert({
      user_id: user.id,
      name: "Dompet Utama",
      starting_balance: 0,
      currency: "IDR",
    }, { onConflict: "user_id,name", ignoreDuplicates: true }),
    missingCategories.length === 0 ? null : db.from("categories").upsert(
      missingCategories.map(([name, type]) => ({
        user_id: user.id,
        name,
        type,
        is_default: true,
      })),
      { onConflict: "user_id,name,type", ignoreDuplicates: true },
    ),
  ];

  const results = await Promise.all(writes.map((write) => write ?? Promise.resolve({ error: null })));
  const writeFailures = [
    ["profile_seed", results[0].error],
    ["pocket_seed", results[1].error],
    ["category_seed", results[2].error],
  ].filter((entry) => entry[1]);

  if (writeFailures.length > 0) {
    reportFailures(writeFailures);
    throw new Error("Data awal akun belum dapat disiapkan. Coba masuk kembali.");
  }
}

function reportFailures(failures: unknown[][]) {
  const details = failures.map(([operation, error]) => {
    const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
    return {
      operation,
      code: value.code ?? null,
      message: value.message ?? String(error),
      details: value.details ?? null,
      hint: value.hint ?? null,
    };
  });
  console.error(`Onboarding gagal: ${JSON.stringify(details)}`);
}
