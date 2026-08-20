import { ensureOnboarding } from "@/app/actions/onboarding";
import { EventWorkspace } from "@/components/event-workspace";
import { auth } from "@/lib/auth/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { EventRow, ReminderRow, eventFromRow } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { data: session } = await auth.getSession();
  await ensureOnboarding();
  const { db, user } = await getAuthenticatedDatabase();
  const [eventResult, reminderResult, taskResult] = await Promise.all([
    db.from("events").select("id,title,description,location,support_link,event_at,event_end_at")
      .eq("user_id", user.id).order("event_at", { ascending: true }),
    db.from("event_reminders").select("id,event_id,remind_at,is_default")
      .eq("user_id", user.id).order("remind_at", { ascending: true }),
    db.from("tasks").select("due_at")
      .eq("user_id", user.id).is("deleted_at", null),
  ]);
  if (eventResult.error || reminderResult.error || taskResult.error) throw new Error("Agenda belum dapat dimuat. Coba muat ulang halaman.");

  const reminders = (reminderResult.data ?? []) as ReminderRow[];
  const events = ((eventResult.data ?? []) as EventRow[]).map((event) => eventFromRow(event, reminders));

  return <EventWorkspace
    initialEvents={events}
    initialTaskDates={(taskResult.data ?? []).map((task) => String(task.due_at))}
    userName={session?.user?.name ?? "Pengguna"}
    referenceTime={new Date().toISOString()}
  />;
}
