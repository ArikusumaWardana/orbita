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

export type TaskHistoryFilter = {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export type TaskHistoryResult = {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export async function getTaskHistory(filter: TaskHistoryFilter = {}): Promise<TaskHistoryResult> {
  const { db, user } = await getAuthenticatedDatabase();
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(50, Math.max(1, filter.limit ?? 8));
  const offset = (page - 1) * limit;

  let query = db
    .from("tasks")
    .select("id,title,description,due_at,completed_at,order_index", { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "completed")
    .is("deleted_at", null);

  const search = filter.search?.trim();
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (filter.startDate) {
    const startIso = new Date(`${filter.startDate}T00:00:00`).toISOString();
    query = query.gte("completed_at", startIso);
  }

  if (filter.endDate) {
    const endIso = new Date(`${filter.endDate}T23:59:59.999`).toISOString();
    query = query.lte("completed_at", endIso);
  }

  const { data, count, error } = await query
    .order("completed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Get task history error", error);
    throw new Error("Riwayat task belum dapat dimuat.");
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    tasks: ((data ?? []) as TaskRow[]).map(taskFromRow),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
