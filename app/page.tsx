import { TaskWorkspace } from "@/components/task-workspace";
import { ensureOnboarding } from "@/app/actions/onboarding";
import { auth } from "@/lib/auth/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";
import { TaskRow, taskFromRow } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: session } = await auth.getSession();
  await ensureOnboarding();
  const { db, user } = await getAuthenticatedDatabase();
  const { data: rows, error } = await db
    .from("tasks")
    .select("id,title,description,due_at,completed_at,order_index")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("status", { ascending: true })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Task belum dapat dimuat. Coba muat ulang halaman.");

  return (
    <TaskWorkspace
      initialTasks={(rows as TaskRow[]).map(taskFromRow)}
      userName={session?.user?.name ?? "Pengguna"}
    />
  );
}
