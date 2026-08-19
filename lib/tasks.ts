export type Task = {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  completedAt: string | null;
  orderIndex: number;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: Date | string;
  completed_at: Date | string | null;
  order_index: string | number;
};

export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    dueAt: new Date(row.due_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    orderIndex: Number(row.order_index),
  };
}
