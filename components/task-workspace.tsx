"use client";

import {
  CalendarDays,
  Bot,
  Check,
  CheckSquare2,
  CircleAlert,
  Clock3,
  GripVertical,
  Home,
  Loader2,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTask as createTaskAction,
  deleteTask as deleteTaskAction,
  reorderTasks as reorderTasksAction,
  setTaskCompleted,
} from "@/app/actions/tasks";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/notification-center";
import { Task } from "@/lib/tasks";

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TaskWorkspace({ initialTasks, userName }: { initialTasks: Task[]; userName: string }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("ready");
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [view, setView] = useState<"active" | "history">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<Task | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTasks = useCallback(() => {
    setErrorMessage("");
    setTasks(initialTasks);
    setStatus("ready");
  }, [initialTasks]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("orbita.theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    queueMicrotask(() => {
      setTheme(nextTheme);
    });
  }, []);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => (view === "active" ? !task.completedAt : Boolean(task.completedAt))),
    [tasks, view],
  );

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("orbita.theme", nextTheme);
  }

  async function createTask(task: Pick<Task, "title" | "description" | "dueAt">) {
    const created = await createTaskAction(task);
    setTasks((current) => [...current, created]);
    setDialogOpen(false);
    setView("active");
  }

  async function completeTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const previous = tasks;
    setTasks(tasks.map((item) => (item.id === id ? { ...item, completedAt: new Date().toISOString() } : item)));
    setLastCompleted(task);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setLastCompleted(null), 5000);
    try {
      const updated = await setTaskCompleted(id, true);
      setTasks((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      setTasks(previous);
      setLastCompleted(null);
      showError(error, "Task belum dapat diselesaikan.");
    }
  }

  async function undoComplete() {
    if (!lastCompleted) return;
    const task = lastCompleted;
    const previous = tasks;
    setTasks(tasks.map((item) => (item.id === task.id ? { ...item, completedAt: null } : item)));
    setLastCompleted(null);
    try {
      const updated = await setTaskCompleted(task.id, false);
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (error) {
      setTasks(previous);
      showError(error, "Task belum dapat dipulihkan.");
    }
  }

  async function removeTask(id: string) {
    const previous = tasks;
    setTasks(tasks.filter((task) => task.id !== id));
    try {
      await deleteTaskAction(id);
    } catch (error) {
      setTasks(previous);
      showError(error, "Task belum dapat dihapus.");
    }
  }

  function reorderVisibleTasks(reordered: Task[]) {
    const visibleIds = new Set(visibleTasks.map((task) => task.id));
    const queue = [...reordered];
    const nextTasks = tasks.map((task) => (visibleIds.has(task.id) ? queue.shift() ?? task : task));
    setTasks(nextTasks);
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(async () => {
      try {
        await reorderTasksAction(reordered.map((task) => task.id));
      } catch (error) {
        showError(error, "Urutan task belum dapat disimpan.");
      }
    }, 350);
  }

  function showError(error: unknown, fallback: string) {
    setErrorMessage(error instanceof Error ? error.message : fallback);
    setStatus("error");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="wordmark" aria-label="Orbita">
          <span className="orbit-mark" aria-hidden="true"><span /></span>
          <span>Orbita</span>
        </div>
        <nav className="side-nav">
          <Link className="nav-item" href="/today"><Home aria-hidden="true" /> <span>Hari ini</span></Link>
          <button type="button" className="nav-item active" aria-current="page" onClick={() => setView("active")}>
            <CheckSquare2 aria-hidden="true" /> <span>Task</span>
          </button>
          <Link className="nav-item" href="/events"><CalendarDays aria-hidden="true" /><span>Agenda</span></Link>
          <Link className="nav-item" href="/finance"><WalletCards aria-hidden="true" /><span>Keuangan</span></Link>
          <Link className="nav-item" href="/assistant"><Bot aria-hidden="true" /><span>Asisten</span></Link>
        </nav>
        <div className="sidebar-footer">
          <p className="signed-in-user">Masuk sebagai <strong>{userName}</strong></p>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Gunakan tema ${theme === "dark" ? "terang" : "gelap"}`}>
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            <span>{theme === "dark" ? "Tema terang" : "Tema gelap"}</span>
          </button>
          <SignOutButton />
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Ruang kerja pribadi</p>
            <h1>Task</h1>
          </div>
          <div className="top-actions">
            <NotificationCenter />
            <button type="button" className="icon-button mobile-theme" onClick={toggleTheme} aria-label={`Gunakan tema ${theme === "dark" ? "terang" : "gelap"}`}>
              {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
            <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
              <Plus aria-hidden="true" /> Task
            </button>
          </div>
        </header>

        <section className="task-panel" aria-labelledby="task-list-heading">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Fokus sekarang</p>
              <h2 id="task-list-heading">{view === "active" ? "Task aktif" : "Riwayat selesai"}</h2>
            </div>
            <div className="tabs" role="tablist" aria-label="Tampilan task">
              <button type="button" role="tab" aria-selected={view === "active"} onClick={() => setView("active")}>Aktif</button>
              <button type="button" role="tab" aria-selected={view === "history"} onClick={() => setView("history")}>Riwayat</button>
            </div>
          </div>

          {status === "loading" && <LoadingState />}
          {status === "error" && <ErrorState message={errorMessage} retry={loadTasks} />}
          {status === "ready" && visibleTasks.length === 0 && (
            <EmptyState history={view === "history"} onCreate={() => setDialogOpen(true)} />
          )}
          {status === "ready" && visibleTasks.length > 0 && (
            <Reorder.Group className="task-list" axis="y" values={visibleTasks} onReorder={reorderVisibleTasks}>
              <AnimatePresence initial={false}>
                {visibleTasks.map((task) => (
                  <Reorder.Item key={task.id} value={task} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }}>
                    <span className="drag-handle" aria-label={`Geser ${task.title} untuk mengubah urutan`}><GripVertical aria-hidden="true" /></span>
                    {view === "active" ? (
                      <button type="button" className="complete-button" onClick={() => completeTask(task.id)} aria-label={`Tandai ${task.title} selesai`}><Check /></button>
                    ) : <span className="completed-mark" aria-hidden="true"><Check /></span>}
                    <div className="task-copy">
                      <strong>{task.title}</strong>
                      {task.description && <p>{task.description}</p>}
                      <span><Clock3 aria-hidden="true" /> {formatDueDate(task.dueAt)}</span>
                    </div>
                    <button type="button" className="delete-button" onClick={() => removeTask(task.id)} aria-label={`Hapus ${task.title}`}><Trash2 /></button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi mobile">
        <Link href="/today"><Home aria-hidden="true" /><span>Hari ini</span></Link>
        <button type="button" className="active" aria-current="page" onClick={() => setView("active")}><CheckSquare2 aria-hidden="true" /><span>Task</span></button>
        <Link href="/events"><CalendarDays aria-hidden="true" /><span>Agenda</span></Link>
        <Link href="/finance"><WalletCards aria-hidden="true" /><span>Keuangan</span></Link>
        <Link href="/assistant"><Bot aria-hidden="true" /><span>Asisten</span></Link>
      </nav>

      <AnimatePresence>{dialogOpen && <TaskDialog close={() => setDialogOpen(false)} submit={createTask} />}</AnimatePresence>
      <AnimatePresence>{lastCompleted && <UndoToast title={lastCompleted.title} undo={undoComplete} dismiss={() => setLastCompleted(null)} />}</AnimatePresence>
    </div>
  );
}

function TaskDialog({ close, submit }: { close: () => void; submit: (task: Pick<Task, "title" | "description" | "dueAt">) => Promise<void> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await submit({ title: String(data.get("title")).trim(), description: String(data.get("description")).trim(), dueAt: new Date(String(data.get("dueAt"))).toISOString() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Task belum dapat disimpan.");
      setSaving(false);
    }
  }

  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <motion.div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-task-title" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}>
        <div className="dialog-heading"><div><p className="section-kicker">Catat sebelum terlupa</p><h2 id="new-task-title">Task baru</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Tutup form"><X /></button></div>
        <form onSubmit={onSubmit}>
          <label>Judul<input name="title" required maxLength={200} placeholder="Apa yang perlu dikerjakan?" /></label>
          <label>Catatan<textarea name="description" maxLength={2000} rows={3} placeholder="Detail opsional" /></label>
          <label>Jatuh tempo<input name="dueAt" type="datetime-local" required defaultValue={localDateTimeValue()} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="secondary-button" onClick={close}>Batal</button><button type="submit" className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" />} {saving ? "Menyimpan..." : "Simpan task"}</button></div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function LoadingState() { return <div className="state-card" aria-live="polite"><Loader2 className="spin" /><p>Memuat task...</p></div>; }

function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <div className="state-card error-state"><CircleAlert /><h3>Task belum dapat dibuka</h3><p>{message}</p><button type="button" className="secondary-button" onClick={retry}><RotateCcw /> Coba lagi</button></div>; }

function EmptyState({ history, onCreate }: { history: boolean; onCreate: () => void }) { return <div className="state-card empty-state"><span className="empty-orbit" aria-hidden="true"><CheckSquare2 /></span><h3>{history ? "Belum ada task selesai" : "Ruang fokusmu masih kosong"}</h3><p>{history ? "Task yang selesai akan tersimpan di sini." : "Tambahkan satu hal yang ingin kamu selesaikan."}</p>{!history && <button type="button" className="secondary-button" onClick={onCreate}><Plus /> Tambah task pertama</button>}</div>; }

function UndoToast({ title, undo, dismiss }: { title: string; undo: () => void; dismiss: () => void }) { return <motion.div className="undo-toast" role="status" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}><div><strong>Task selesai</strong><span>{title}</span></div><button type="button" onClick={undo}>Urungkan</button><button type="button" className="toast-close" onClick={dismiss} aria-label="Tutup notifikasi"><X /></button><span className="toast-progress" /></motion.div>; }
