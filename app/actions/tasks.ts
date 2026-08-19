"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { Task, TaskRow, taskFromRow } from "@/lib/tasks";

type CreateTaskInput = {
  title: string;
  description: string;
  dueAt: string;
};

function validateTask(input: CreateTaskInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  const dueAt = new Date(input.dueAt);

  if (!title || title.length > 200) throw new Error("Judul task harus berisi 1 sampai 200 karakter.");
  if (description.length > 2000) throw new Error("Catatan task maksimal 2.000 karakter.");
  if (Number.isNaN(dueAt.getTime())) throw new Error("Waktu jatuh tempo tidak valid.");

  return { title, description, dueAt: dueAt.toISOString() };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const task = validateTask(input);
  const { db, user } = await getAuthenticatedDatabase();
  const { data: lastTask, error: orderError } = await db
    .from("tasks")
    .select("order_index")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) throw new Error("Task belum dapat disimpan. Coba lagi.");

  const { data, error } = await db.from("tasks").insert({
    user_id: user.id,
    title: task.title,
    description: task.description || null,
    due_at: task.dueAt,
    order_index: Number(lastTask?.order_index ?? -1) + 1,
  }).select("id,title,description,due_at,completed_at,order_index").single();
  if (error || !data) throw new Error("Task belum dapat disimpan. Coba lagi.");
  revalidatePath("/");
  return taskFromRow(data as TaskRow);
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<Task> {
  const { db, user } = await getAuthenticatedDatabase();
  const { data, error } = await db.from("tasks").update({
    status: completed ? "completed" : "pending",
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id).is("deleted_at", null)
    .select("id,title,description,due_at,completed_at,order_index").single();
  if (error || !data) throw new Error("Task tidak ditemukan.");
  revalidatePath("/");
  return taskFromRow(data as TaskRow);
}

export async function deleteTask(id: string) {
  const { db, user } = await getAuthenticatedDatabase();
  const { data, error } = await db.from("tasks").update({
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id).is("deleted_at", null).select("id").single();
  if (error || !data) throw new Error("Task tidak ditemukan.");
  revalidatePath("/");
}

export async function reorderTasks(ids: string[]) {
  if (ids.length > 500 || new Set(ids).size !== ids.length) {
    throw new Error("Urutan task tidak valid.");
  }
  const { db, user } = await getAuthenticatedDatabase();
  const results = await Promise.all(ids.map((id, index) => db.from("tasks").update({
    order_index: index,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id).is("deleted_at", null)));
  if (results.some((result) => result.error)) throw new Error("Urutan task belum dapat disimpan.");
  revalidatePath("/");
}
