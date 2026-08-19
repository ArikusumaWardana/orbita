import { ensureOnboarding } from "@/app/actions/onboarding";
import { AssistantWorkspace } from "@/components/assistant-workspace";
import { AssistantMessageRow, assistantMessageFromRow } from "@/lib/assistant";
import { auth } from "@/lib/auth/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { CategoryRow, PocketRow, pocketFromRow } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const { data: session } = await auth.getSession();
  await ensureOnboarding();
  const { db, user } = await getAuthenticatedDatabase();
  const [history, profile, pockets, categories] = await Promise.all([
    db.from("ai_conversations").select("id,role,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    db.from("profiles").select("ai_daily_request_count,ai_request_reset_at").eq("id", user.id).single(),
    db.from("pockets").select("id,name,starting_balance,currency").eq("user_id", user.id).order("created_at"),
    db.from("categories").select("id,name,type").eq("user_id", user.id).order("name"),
  ]);
  if (history.error || profile.error || pockets.error || categories.error) throw new Error("Asisten belum dapat dimuat. Coba muat ulang halaman.");

  const resetAt = new Date(String(profile.data.ai_request_reset_at));
  const used = resetAt <= new Date() ? 0 : Number(profile.data.ai_daily_request_count);
  return <AssistantWorkspace initialMessages={(history.data as AssistantMessageRow[]).reverse().map(assistantMessageFromRow)} initialRemaining={Math.max(0, 30 - used)} pockets={(pockets.data as PocketRow[]).map(pocketFromRow)} categories={categories.data as CategoryRow[]} userName={session?.user?.name ?? "Pengguna"} />;
}
