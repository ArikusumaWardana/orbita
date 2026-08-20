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
  const [activeRes, historyRes] = await Promise.all([
    db.from("tasks")
      .select("id,title,description,due_at,completed_at,order_index")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    db.from("tasks")
      .select("id,title,description,due_at,completed_at,order_index", { count: "exact" })
      .eq("user_id", user.id)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("completed_at", { ascending: false })
      .range(0, 7),
  ]);

  if (activeRes.error || historyRes.error) {
    throw new Error("Task belum dapat dimuat. Coba muat ulang halaman.");
  }

  const activeTasks = ((activeRes.data ?? []) as TaskRow[]).map(taskFromRow);
  const historyTasks = ((historyRes.data ?? []) as TaskRow[]).map(taskFromRow);
  const totalHistory = historyRes.count ?? historyTasks.length;

  return (
    <TaskWorkspace
      initialActiveTasks={activeTasks}
      initialHistoryResult={{
        tasks: historyTasks,
        pagination: {
          page: 1,
          limit: 8,
          total: totalHistory,
          totalPages: Math.ceil(totalHistory / 8) || 1,
          hasNextPage: totalHistory > 8,
          hasPrevPage: false,
        },
      }}
      userName={session?.user?.name ?? "Pengguna"}
    />
  );
}
