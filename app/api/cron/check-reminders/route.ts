import { Pool } from "@neondatabase/serverless";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PendingNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "task_due" | "event_reminder";
  resource_id: string | null;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_id: string;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return Response.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  let pending: PendingNotification[] = [];
  let databaseFailed = false;
  try {
    await client.query("begin");
    const eventNotifications = await client.query<PendingNotification>(`
      with claimed as (
        select reminder.id, reminder.user_id, reminder.event_id, event.title
        from public.event_reminders reminder
        join public.events event on event.id = reminder.event_id and event.user_id = reminder.user_id
        where reminder.notified_at is null and reminder.remind_at <= now()
        order by reminder.remind_at
        for update of reminder skip locked
        limit 100
      ), marked as (
        update public.event_reminders reminder
        set notified_at = now()
        from claimed
        where reminder.id = claimed.id
        returning claimed.user_id, claimed.event_id, claimed.title
      )
      insert into public.notifications (user_id, title, body, type, resource_id)
      select user_id, 'Agenda segera dimulai', title, 'event_reminder', event_id from marked
      returning id, user_id, title, body, type, resource_id
    `);
    const taskHourNotifications = await client.query<PendingNotification>(`
      with claimed as (
        select id, user_id, title from public.tasks
        where status = 'pending' and deleted_at is null and notified_60m_at is null
          and due_at > now() + interval '10 minutes' and due_at <= now() + interval '60 minutes'
        order by due_at
        for update skip locked
        limit 100
      ), marked as (
        update public.tasks task set notified_60m_at = now()
        from claimed where task.id = claimed.id
        returning claimed.user_id, claimed.id, claimed.title
      )
      insert into public.notifications (user_id, title, body, type, resource_id)
      select user_id, 'Task jatuh tempo dalam 1 jam', title, 'task_due', id from marked
      returning id, user_id, title, body, type, resource_id
    `);
    const taskTenMinuteNotifications = await client.query<PendingNotification>(`
      with claimed as (
        select id, user_id, title from public.tasks
        where status = 'pending' and deleted_at is null and notified_10m_at is null
          and due_at <= now() + interval '10 minutes'
        order by due_at
        for update skip locked
        limit 100
      ), marked as (
        update public.tasks task set notified_10m_at = now()
        from claimed where task.id = claimed.id
        returning claimed.user_id, claimed.id, claimed.title
      )
      insert into public.notifications (user_id, title, body, type, resource_id)
      select user_id, 'Task jatuh tempo dalam 10 menit', title, 'task_due', id from marked
      returning id, user_id, title, body, type, resource_id
    `);
    pending = [...eventNotifications.rows, ...taskHourNotifications.rows, ...taskTenMinuteNotifications.rows];
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    console.error("Cron reminder gagal memproses database", error);
    databaseFailed = true;
  } finally {
    client.release();
  }
  if (databaseFailed) {
    await pool.end();
    return Response.json({ error: "Reminder belum dapat diproses." }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (pending.length > 0 && vapidSubject && vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const userIds = [...new Set(pending.map((item) => item.user_id))];
    const subscriptions = await pool.query<SubscriptionRow>(
      "select endpoint, p256dh, auth_key, user_id from public.push_subscriptions where user_id = any($1::uuid[])",
      [userIds],
    );
    const byUser = new Map<string, SubscriptionRow[]>();
    for (const subscription of subscriptions.rows) byUser.set(subscription.user_id, [...(byUser.get(subscription.user_id) ?? []), subscription]);
    await Promise.all(pending.flatMap((notification) => (byUser.get(notification.user_id) ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify({
          title: notification.title,
          body: notification.body,
          url: notification.type === "event_reminder" ? "/events" : "/",
          tag: notification.id,
        }));
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) await pool.query("delete from public.push_subscriptions where endpoint = $1", [subscription.endpoint]);
      }
    })));
  }
  await pool.end();
  return Response.json({ created: pending.length, pushSent: sent, pushFailed: failed });
}
