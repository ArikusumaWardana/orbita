import { ensureOnboarding } from "@/app/actions/onboarding";
import { TodayWorkspace } from "@/components/today-workspace";
import { auth } from "@/lib/auth/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";

export const dynamic = "force-dynamic";

function offsetAt(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(date).find((item) => item.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = part.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

function dayRange(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const localMidnight = Date.UTC(value("year"), value("month") - 1, value("day"));
  const start = new Date(localMidnight - offsetAt(new Date(localMidnight), timeZone));
  const nextLocalMidnight = localMidnight + 86_400_000;
  const end = new Date(nextLocalMidnight - offsetAt(new Date(nextLocalMidnight), timeZone));
  return { start: start.toISOString(), end: end.toISOString(), date: `${value("year")}-${String(value("month")).padStart(2, "0")}-${String(value("day")).padStart(2, "0")}` };
}

export default async function TodayPage() {
  const { data: session } = await auth.getSession();
  await ensureOnboarding();
  const { db, user } = await getAuthenticatedDatabase();
  const profile = await db.from("profiles").select("timezone").eq("id", user.id).single();
  if (profile.error) throw new Error("Zona waktu akun belum dapat dibaca.");
  const timezone = String(profile.data.timezone || "Asia/Makassar");
  const range = dayRange(new Date(), timezone);

  const [tasks, eventStarts, eventSpans, transactions] = await Promise.all([
    db.from("tasks").select("id,title,description,due_at").eq("user_id", user.id).eq("status", "pending").is("deleted_at", null).gte("due_at", range.start).lt("due_at", range.end).order("due_at").limit(8),
    db.from("events").select("id,title,description,location,support_link,event_at,event_end_at").eq("user_id", user.id).gte("event_at", range.start).lt("event_at", range.end).order("event_at").limit(8),
    db.from("events").select("id,title,description,location,support_link,event_at,event_end_at").eq("user_id", user.id).lt("event_at", range.start).gte("event_end_at", range.start).order("event_at", { ascending: false }).limit(8),
    db.from("transactions").select("id,type,amount,description,transaction_date").eq("user_id", user.id).eq("transaction_date", range.date).order("created_at", { ascending: false }).limit(100),
  ]);
  if (tasks.error || eventStarts.error || eventSpans.error || transactions.error) throw new Error("Ringkasan hari ini belum dapat dimuat. Coba muat ulang halaman.");
  const events = [...(eventSpans.data ?? []), ...(eventStarts.data ?? [])].sort((a, b) => String(a.event_at).localeCompare(String(b.event_at))).slice(0, 8);

  return <TodayWorkspace userName={session?.user?.name ?? "Pengguna"} timezone={timezone} referenceTime={new Date().toISOString()} tasks={tasks.data ?? []} events={events} transactions={(transactions.data ?? []).map((item) => ({ ...item, amount: Number(item.amount) }))} />;
}
