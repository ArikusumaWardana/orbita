"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { EventItem, EventRow, ReminderRow, eventFromRow } from "@/lib/events";

type EventInput = {
  title: string;
  description: string;
  location: string;
  eventAt: string;
  eventEndAt: string | null;
};

function validateEvent(input: EventInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  const location = input.location.trim();
  const eventAt = new Date(input.eventAt);
  const eventEndAt = input.eventEndAt ? new Date(input.eventEndAt) : null;

  if (!title || title.length > 200) throw new Error("Judul agenda harus berisi 1 sampai 200 karakter.");
  if (description.length > 2000) throw new Error("Catatan agenda maksimal 2.000 karakter.");
  if (location.length > 300) throw new Error("Lokasi maksimal 300 karakter.");
  if (Number.isNaN(eventAt.getTime())) throw new Error("Waktu agenda tidak valid.");
  if (eventEndAt && Number.isNaN(eventEndAt.getTime())) throw new Error("Waktu selesai agenda tidak valid.");
  if (eventEndAt && eventEndAt <= eventAt) throw new Error("Waktu selesai harus sesudah waktu mulai.");

  return { title, description, location, eventAt: eventAt.toISOString(), eventEndAt: eventEndAt?.toISOString() ?? null };
}

function validateReminder(value: string) {
  const remindAt = new Date(value);
  if (Number.isNaN(remindAt.getTime())) throw new Error("Waktu pengingat tidak valid.");
  return remindAt.toISOString();
}

async function loadEvent(id: string): Promise<EventItem> {
  const { db, user } = await getAuthenticatedDatabase();
  const [eventResult, reminderResult] = await Promise.all([
    db.from("events").select("id,title,description,location,event_at,event_end_at")
      .eq("id", id).eq("user_id", user.id).single(),
    db.from("event_reminders").select("id,event_id,remind_at,is_default")
      .eq("event_id", id).eq("user_id", user.id).order("remind_at"),
  ]);
  if (eventResult.error || !eventResult.data || reminderResult.error) throw new Error("Agenda tidak ditemukan.");
  return eventFromRow(eventResult.data as EventRow, (reminderResult.data ?? []) as ReminderRow[]);
}

export async function createEvent(input: EventInput): Promise<EventItem> {
  const event = validateEvent(input);
  const { db, user } = await getAuthenticatedDatabase();
  const { data, error } = await db.from("events").insert({
    user_id: user.id,
    title: event.title,
    description: event.description || null,
    location: event.location || null,
    event_at: event.eventAt,
    event_end_at: event.eventEndAt,
  }).select("id,title,description,location,event_at,event_end_at").single();
  if (error || !data) {
    console.error("Create agenda gagal", error ? {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    } : { message: "Data API tidak mengembalikan agenda." });
    throw new Error(error?.code === "PGRST204"
      ? "Skema rentang waktu sedang diperbarui. Muat ulang halaman lalu coba lagi."
      : "Agenda belum dapat disimpan. Coba lagi.");
  }

  const defaultReminder = new Date(new Date(event.eventAt).getTime() - 10 * 60_000).toISOString();
  const reminderResult = await db.from("event_reminders").insert({
    event_id: data.id,
    user_id: user.id,
    remind_at: defaultReminder,
    is_default: true,
  }).select("id,event_id,remind_at,is_default").single();

  if (reminderResult.error || !reminderResult.data) {
    await db.from("events").delete().eq("id", data.id).eq("user_id", user.id);
    throw new Error("Pengingat bawaan belum dapat dibuat. Agenda tidak disimpan.");
  }

  revalidatePath("/events");
  return eventFromRow(data as EventRow, [reminderResult.data as ReminderRow]);
}

export async function updateEvent(id: string, input: EventInput): Promise<EventItem> {
  const event = validateEvent(input);
  const { db, user } = await getAuthenticatedDatabase();
  const { data, error } = await db.from("events").update({
    title: event.title,
    description: event.description || null,
    location: event.location || null,
    event_at: event.eventAt,
    event_end_at: event.eventEndAt,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id)
    .select("id,title,description,location,event_at,event_end_at").single();
  if (error || !data) throw new Error("Agenda tidak ditemukan.");

  const defaultReminder = new Date(new Date(event.eventAt).getTime() - 10 * 60_000).toISOString();
  const existing = await db.from("event_reminders").select("id")
    .eq("event_id", id).eq("user_id", user.id).eq("is_default", true).maybeSingle();
  if (existing.error) throw new Error("Pengingat agenda belum dapat diperbarui.");

  const reminderResult = existing.data
    ? await db.from("event_reminders").update({ remind_at: defaultReminder, notified_at: null })
      .eq("id", existing.data.id).eq("user_id", user.id)
    : await db.from("event_reminders").insert({
      event_id: id, user_id: user.id, remind_at: defaultReminder, is_default: true,
    });
  if (reminderResult.error) throw new Error("Agenda tersimpan, tetapi pengingat bawaan belum dapat diperbarui.");

  revalidatePath("/events");
  return loadEvent(id);
}

export async function deleteEvent(id: string) {
  const { db, user } = await getAuthenticatedDatabase();
  const { data, error } = await db.from("events").delete()
    .eq("id", id).eq("user_id", user.id).select("id").single();
  if (error || !data) throw new Error("Agenda tidak ditemukan.");
  revalidatePath("/events");
}

export async function addEventReminder(eventId: string, value: string): Promise<EventItem> {
  const remindAt = validateReminder(value);
  const { db, user } = await getAuthenticatedDatabase();
  const event = await db.from("events").select("id,event_at")
    .eq("id", eventId).eq("user_id", user.id).single();
  if (event.error || !event.data) throw new Error("Agenda tidak ditemukan.");
  if (new Date(remindAt) >= new Date(event.data.event_at)) throw new Error("Pengingat harus dijadwalkan sebelum agenda dimulai.");

  const { error } = await db.from("event_reminders").insert({
    event_id: eventId, user_id: user.id, remind_at: remindAt, is_default: false,
  });
  if (error) throw new Error("Pengingat belum dapat ditambahkan.");
  revalidatePath("/events");
  return loadEvent(eventId);
}

export async function updateEventReminder(id: string, eventId: string, value: string): Promise<EventItem> {
  const remindAt = validateReminder(value);
  const { db, user } = await getAuthenticatedDatabase();
  const event = await db.from("events").select("event_at")
    .eq("id", eventId).eq("user_id", user.id).single();
  if (event.error || !event.data) throw new Error("Agenda tidak ditemukan.");
  if (new Date(remindAt) >= new Date(event.data.event_at)) throw new Error("Pengingat harus dijadwalkan sebelum agenda dimulai.");

  const { data, error } = await db.from("event_reminders").update({ remind_at: remindAt, notified_at: null })
    .eq("id", id).eq("event_id", eventId).eq("user_id", user.id).eq("is_default", false)
    .select("id").single();
  if (error || !data) throw new Error("Pengingat tidak ditemukan.");
  revalidatePath("/events");
  return loadEvent(eventId);
}

export async function deleteEventReminder(id: string, eventId: string): Promise<EventItem> {
  const { db, user } = await getAuthenticatedDatabase();
  const { data, error } = await db.from("event_reminders").delete()
    .eq("id", id).eq("event_id", eventId).eq("user_id", user.id).eq("is_default", false)
    .select("id").single();
  if (error || !data) throw new Error("Pengingat tidak ditemukan.");
  revalidatePath("/events");
  return loadEvent(eventId);
}
