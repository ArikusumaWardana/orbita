"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedDatabase } from "@/lib/db/server";

export async function clearConversationHistory() {
  const { db, user } = await getAuthenticatedDatabase();
  const { error } = await db.from("ai_conversations").delete().eq("user_id", user.id);
  if (error) {
    console.error("Hapus histori asisten gagal", error);
    throw new Error("Percakapan belum dapat dikosongkan. Coba lagi.");
  }
  revalidatePath("/assistant");
}
