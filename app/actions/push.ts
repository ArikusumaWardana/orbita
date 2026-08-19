"use server";

import { getAuthenticatedDatabase } from "@/lib/db/server";

type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  authKey: string;
};

function validateSubscription(input: PushSubscriptionInput) {
  if (!input.endpoint.startsWith("https://") || input.endpoint.length > 4000) throw new Error("Endpoint push tidak valid.");
  if (!input.p256dh || input.p256dh.length > 1000) throw new Error("Kunci push tidak valid.");
  if (!input.authKey || input.authKey.length > 1000) throw new Error("Kunci autentikasi push tidak valid.");
}

export async function subscribeToPush(input: PushSubscriptionInput) {
  validateSubscription(input);
  const { db, user } = await getAuthenticatedDatabase();
  const { error } = await db.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth_key: input.authKey,
  }, { onConflict: "endpoint" });
  if (error) throw new Error("Langganan notifikasi belum dapat disimpan.");
}

export async function unsubscribeFromPush(endpoint: string) {
  if (!endpoint.startsWith("https://") || endpoint.length > 4000) throw new Error("Endpoint push tidak valid.");
  const { db, user } = await getAuthenticatedDatabase();
  const { error } = await db.from("push_subscriptions").delete()
    .eq("endpoint", endpoint).eq("user_id", user.id);
  if (error) throw new Error("Langganan notifikasi belum dapat dihapus.");
}
