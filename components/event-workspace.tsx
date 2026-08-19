"use client";

import {
  Bell,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare2,
  Clock3,
  Home,
  Loader2,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  addEventReminder,
  createEvent,
  deleteEvent,
  deleteEventReminder,
  updateEvent,
  updateEventReminder,
} from "@/app/actions/events";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/notification-center";
import { showToast } from "@/components/ui/toast-provider";
import { EventItem, EventReminder } from "@/lib/events";

type EventInput = Pick<EventItem, "title" | "description" | "location" | "eventAt" | "eventEndAt">;

function localDateTimeValue(value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatEventTime(event: EventItem) {
  if (!event.eventEndAt) return formatDateTime(event.eventAt);
  const start = new Date(event.eventAt);
  const end = new Date(event.eventEndAt);
  const sameDay = dateKey(start) === dateKey(end);
  const startLabel = formatDateTime(event.eventAt);
  const endLabel = new Intl.DateTimeFormat("id-ID", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(end);
  return `${startLabel} - ${endLabel}`;
}

function dateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventOccursOnDate(event: EventItem, key: string) {
  const dayStart = new Date(`${key}T00:00:00`);
  const dayEnd = new Date(`${key}T23:59:59.999`);
  const eventStart = new Date(event.eventAt);
  const eventEnd = new Date(event.eventEndAt ?? event.eventAt);
  return eventStart <= dayEnd && eventEnd >= dayStart;
}

export function EventWorkspace({ initialEvents, initialTaskDates, userName, referenceTime }: { initialEvents: EventItem[]; initialTaskDates: string[]; userName: string; referenceTime: string }) {
  const [events, setEvents] = useState(initialEvents);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [editing, setEditing] = useState<EventItem | null | undefined>(undefined);
  const [reminderTarget, setReminderTarget] = useState<{ event: EventItem; reminder?: EventReminder } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const nextTheme = window.localStorage.getItem("orbita.theme") === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    queueMicrotask(() => setTheme(nextTheme));
  }, []);

  const visibleEvents = useMemo(() => {
    const now = new Date(referenceTime).getTime();
    return events
      .filter((event) => view === "upcoming" ? new Date(event.eventEndAt ?? event.eventAt).getTime() >= now : new Date(event.eventEndAt ?? event.eventAt).getTime() < now)
      .filter((event) => !selectedDate || eventOccursOnDate(event, selectedDate))
      .sort((a, b) => view === "upcoming" ? a.eventAt.localeCompare(b.eventAt) : b.eventAt.localeCompare(a.eventAt));
  }, [events, referenceTime, selectedDate, view]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("orbita.theme", nextTheme);
  }

  async function saveEvent(input: EventInput) {
    const saved = editing ? await updateEvent(editing.id, input) : await createEvent(input);
    setEvents((current) => editing
      ? current.map((event) => event.id === saved.id ? saved : event)
      : [...current, saved]);
    setEditing(undefined);
    setView(new Date(saved.eventAt).getTime() < Date.now() ? "past" : "upcoming");
    showToast("success", editing ? "Agenda berhasil diperbarui." : "Agenda dan pengingat 10 menit berhasil dibuat.");
  }

  async function removeEvent() {
    if (!deleteTarget) return;
    try {
      await deleteEvent(deleteTarget.id);
      setEvents((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("success", "Agenda berhasil dihapus.");
    } catch (caught) {
      showToast("error", caught instanceof Error ? caught.message : "Agenda belum dapat dihapus.");
      throw caught;
    }
  }

  async function saveReminder(value: string) {
    if (!reminderTarget) return;
    const updated = reminderTarget.reminder
      ? await updateEventReminder(reminderTarget.reminder.id, reminderTarget.event.id, value)
      : await addEventReminder(reminderTarget.event.id, value);
    setEvents((current) => current.map((event) => event.id === updated.id ? updated : event));
    setReminderTarget(null);
    showToast("success", reminderTarget.reminder ? "Pengingat berhasil diperbarui." : "Pengingat berhasil ditambahkan.");
  }

  async function removeReminder(event: EventItem, reminder: EventReminder) {
    try {
      const updated = await deleteEventReminder(reminder.id, event.id);
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
      showToast("success", "Pengingat berhasil dihapus.");
    } catch (caught) {
      showToast("error", caught instanceof Error ? caught.message : "Pengingat belum dapat dihapus.");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigasi utama">
        <Link className="wordmark wordmark-link" href="/today" aria-label="Orbita"><span className="orbit-mark" aria-hidden="true"><span /></span><span>Orbita</span></Link>
        <nav className="side-nav">
          <Link className="nav-item" href="/today"><Home aria-hidden="true" /><span>Hari ini</span></Link>
          <Link className="nav-item" href="/"><CheckSquare2 aria-hidden="true" /><span>Task</span></Link>
          <Link className="nav-item active" href="/events" aria-current="page"><CalendarDays aria-hidden="true" /><span>Agenda</span></Link>
          <Link className="nav-item" href="/finance"><WalletCards aria-hidden="true" /><span>Keuangan</span></Link>
          <Link className="nav-item" href="/assistant"><Bot aria-hidden="true" /><span>Asisten</span></Link>
        </nav>
        <div className="sidebar-footer">
          <p className="signed-in-user">Masuk sebagai <strong>{userName}</strong></p>
          <button type="button" className="theme-toggle" onClick={toggleTheme}>{theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}<span>{theme === "dark" ? "Tema terang" : "Tema gelap"}</span></button>
          <SignOutButton />
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Waktu dan pengingat</p><h1>Agenda</h1></div>
          <div className="top-actions">
            <NotificationCenter />
            <button type="button" className="icon-button mobile-theme" onClick={toggleTheme} aria-label={`Gunakan tema ${theme === "dark" ? "terang" : "gelap"}`}>{theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
            <button type="button" className="primary-button" onClick={() => setEditing(null)}><Plus aria-hidden="true" /> Agenda</button>
          </div>
        </header>

        <section className="task-panel event-panel" aria-labelledby="event-list-heading">
          <div className="panel-heading">
            <div><p className="section-kicker">Jadwal pribadi</p><h2 id="event-list-heading">{view === "upcoming" ? "Agenda mendatang" : "Agenda lampau"}</h2></div>
            <div className="tabs" role="tablist" aria-label="Tampilan agenda">
              <button type="button" role="tab" aria-selected={view === "upcoming"} onClick={() => setView("upcoming")}>Mendatang</button>
              <button type="button" role="tab" aria-selected={view === "past"} onClick={() => setView("past")}>Lampau</button>
            </div>
          </div>

          <MonthCalendar
            events={events}
            taskDates={initialTaskDates}
            referenceTime={referenceTime}
            selectedDate={selectedDate}
            selectDate={setSelectedDate}
          />

          {selectedDate && <div className="date-filter"><span>Menampilkan agenda pada {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`))}</span><button type="button" onClick={() => setSelectedDate(null)}>Tampilkan semua</button></div>}

          {visibleEvents.length === 0 ? (
            <div className="state-card empty-state"><span className="empty-orbit" aria-hidden="true"><CalendarDays /></span><h3>{selectedDate ? "Tidak ada agenda pada tanggal ini" : view === "upcoming" ? "Belum ada agenda mendatang" : "Belum ada agenda lampau"}</h3><p>{selectedDate ? "Pilih tanggal lain atau tampilkan kembali semua agenda." : view === "upcoming" ? "Tambahkan jadwal agar Orbita dapat mengingatkanmu tepat waktu." : "Agenda yang sudah lewat akan muncul di sini."}</p>{!selectedDate && view === "upcoming" && <button type="button" className="secondary-button" onClick={() => setEditing(null)}><Plus /> Tambah agenda pertama</button>}</div>
          ) : (
            <div className="event-list">
              <AnimatePresence initial={false}>
                {visibleEvents.map((event) => <EventCard key={event.id} event={event} past={view === "past"} edit={() => setEditing(event)} remove={() => setDeleteTarget(event)} addReminder={() => setReminderTarget({ event })} editReminder={(reminder) => setReminderTarget({ event, reminder })} removeReminder={(reminder) => removeReminder(event, reminder)} />)}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi mobile">
        <Link href="/today"><Home aria-hidden="true" /><span>Hari ini</span></Link>
        <Link href="/"><CheckSquare2 aria-hidden="true" /><span>Task</span></Link>
        <Link href="/events" className="active" aria-current="page"><CalendarDays aria-hidden="true" /><span>Agenda</span></Link>
        <Link href="/finance"><WalletCards aria-hidden="true" /><span>Keuangan</span></Link>
        <Link href="/assistant"><Bot aria-hidden="true" /><span>Asisten</span></Link>
      </nav>

      <AnimatePresence>{editing !== undefined && <EventDialog event={editing} close={() => setEditing(undefined)} submit={saveEvent} />}</AnimatePresence>
      <AnimatePresence>{reminderTarget && <ReminderDialog target={reminderTarget} close={() => setReminderTarget(null)} submit={saveReminder} />}</AnimatePresence>
      <AnimatePresence>{deleteTarget && <DeleteEventDialog event={deleteTarget} close={() => setDeleteTarget(null)} confirm={removeEvent} />}</AnimatePresence>
    </div>
  );
}

function MonthCalendar({ events, taskDates, referenceTime, selectedDate, selectDate }: { events: EventItem[]; taskDates: string[]; referenceTime: string; selectedDate: string | null; selectDate: (value: string | null) => void }) {
  const today = new Date(referenceTime);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const taskCounts = useMemo(() => taskDates.reduce<Record<string, number>>((counts, value) => {
    const key = dateKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {}), [taskDates]);
  const days = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [cursor]);
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(cursor);

  function moveMonth(offset: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return <section className="month-calendar" aria-label={`Kalender ${monthLabel}`}>
    <header><div><p className="section-kicker">Kalender</p><h3>{monthLabel}</h3></div><div className="calendar-navigation"><button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft /></button><button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya"><ChevronRight /></button></div></header>
    <div className="calendar-weekdays" aria-hidden="true">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{days.map((day) => {
      const key = dateKey(day);
      const eventCount = events.filter((event) => eventOccursOnDate(event, key)).length;
      const taskCount = taskCounts[key] ?? 0;
      const outside = day.getMonth() !== cursor.getMonth();
      const label = `${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(day)}, ${eventCount} agenda, ${taskCount} task`;
      return <button key={key} type="button" className={`${outside ? "outside" : ""} ${key === dateKey(today) ? "today" : ""}`} aria-pressed={selectedDate === key} aria-label={label} onClick={() => selectDate(selectedDate === key ? null : key)}><span>{day.getDate()}</span><span className="calendar-dots" aria-hidden="true">{eventCount > 0 && <i className="event-dot" />}{taskCount > 0 && <i className="task-dot" />}</span></button>;
    })}</div>
    <footer><span><i className="event-dot" /> Agenda</span><span><i className="task-dot" /> Task</span></footer>
  </section>;
}

function EventCard({ event, past, edit, remove, addReminder, editReminder, removeReminder }: { event: EventItem; past: boolean; edit: () => void; remove: () => void; addReminder: () => void; editReminder: (reminder: EventReminder) => void; removeReminder: (reminder: EventReminder) => void }) {
  return <motion.article className="event-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }}>
    <div className="event-card-main"><div className="event-date"><CalendarDays aria-hidden="true" /><span>{formatEventTime(event)}</span></div><h3>{event.title}</h3>{event.description && <p>{event.description}</p>}{event.location && <div className="event-location"><MapPin aria-hidden="true" />{event.location}</div>}</div>
    <div className="event-card-actions">{!past && <button type="button" className="secondary-button compact-button" onClick={edit}><Pencil /> Edit</button>}<button type="button" className="icon-button delete-button" onClick={remove} aria-label={`Hapus ${event.title}`}><Trash2 /></button></div>
    {!past && <div className="reminder-section"><div className="reminder-heading"><strong>Pengingat</strong><button type="button" onClick={addReminder}><Plus /> Tambah</button></div><ul>{event.reminders.map((reminder) => <li key={reminder.id}><Bell aria-hidden="true" /><span>{formatDateTime(reminder.remindAt)}{reminder.isDefault && <small>10 menit sebelum</small>}</span>{!reminder.isDefault && <><button type="button" className="icon-button" onClick={() => editReminder(reminder)} aria-label="Edit pengingat"><Pencil /></button><button type="button" className="icon-button delete-button" onClick={() => removeReminder(reminder)} aria-label="Hapus pengingat"><Trash2 /></button></>}</li>)}</ul></div>}
  </motion.article>;
}

function DeleteEventDialog({ event, close, confirm }: { event: EventItem; close: () => void; confirm: () => Promise<void> }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const keydown = (key: KeyboardEvent) => {
      if (key.key === "Escape" && !deleting) close();
    };
    window.addEventListener("keydown", keydown);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", keydown);
  }, [close, deleting]);

  async function remove() {
    setDeleting(true);
    try {
      await confirm();
    } catch {
      setDeleting(false);
    }
  }

  return <motion.div className="dialog-backdrop confirm-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(pointer) => { if (!deleting && pointer.target === pointer.currentTarget) close(); }}><motion.div className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title" aria-describedby="delete-event-description" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}><div className="confirm-dialog-icon" aria-hidden="true"><Trash2 /></div><div><h2 id="delete-event-title">Hapus agenda?</h2><p id="delete-event-description">Agenda “{event.title}” dan seluruh pengingatnya akan dihapus permanen.</p></div><div className="dialog-actions"><button ref={cancelRef} type="button" className="secondary-button" onClick={close} disabled={deleting}>Batal</button><button type="button" className="danger-button" onClick={remove} disabled={deleting}>{deleting && <Loader2 className="spin" />}{deleting ? "Menghapus..." : "Hapus agenda"}</button></div></motion.div></motion.div>;
}

function EventDialog({ event, close, submit }: { event: EventItem | null; close: () => void; submit: (input: EventInput) => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasRange, setHasRange] = useState(Boolean(event?.eventEndAt));
  useEffect(() => { const keydown = (key: KeyboardEvent) => { if (key.key === "Escape") close(); }; window.addEventListener("keydown", keydown); ref.current?.querySelector<HTMLInputElement>("input")?.focus(); return () => window.removeEventListener("keydown", keydown); }, [close]);
  async function onSubmit(formEvent: FormEvent<HTMLFormElement>) { formEvent.preventDefault(); setSaving(true); setError(""); const data = new FormData(formEvent.currentTarget); try { const endValue = hasRange ? String(data.get("eventEndAt")) : ""; await submit({ title: String(data.get("title")), description: String(data.get("description")), location: String(data.get("location")), eventAt: new Date(String(data.get("eventAt"))).toISOString(), eventEndAt: endValue ? new Date(endValue).toISOString() : null }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Agenda belum dapat disimpan."); setSaving(false); } }
  const defaultStart = event ? localDateTimeValue(event.eventAt) : localDateTimeValue();
  const defaultEnd = event?.eventEndAt ? localDateTimeValue(event.eventEndAt) : localDateTimeValue(new Date(new Date(defaultStart).getTime() + 60 * 60_000));
  return <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(pointer) => { if (pointer.target === pointer.currentTarget) close(); }}><motion.div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}><div className="dialog-heading"><div><p className="section-kicker">Waktu yang perlu dijaga</p><h2 id="event-dialog-title">{event ? "Edit agenda" : "Agenda baru"}</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Tutup form"><X /></button></div><form onSubmit={onSubmit}><label>Judul<input name="title" required maxLength={200} defaultValue={event?.title} placeholder="Apa yang akan berlangsung?" /></label><label>Catatan<textarea name="description" maxLength={2000} rows={3} defaultValue={event?.description} placeholder="Detail opsional" /></label><label>Lokasi<input name="location" maxLength={300} defaultValue={event?.location} placeholder="Lokasi opsional" /></label><label>Waktu mulai<input name="eventAt" type="datetime-local" required defaultValue={defaultStart} /></label><label className="range-toggle"><input type="checkbox" checked={hasRange} onChange={(change) => setHasRange(change.target.checked)} /><span>Gunakan rentang waktu</span></label>{hasRange && <label>Waktu selesai<input name="eventEndAt" type="datetime-local" required defaultValue={defaultEnd} /></label>}<p className="field-help">Pengingat bawaan dijadwalkan 10 menit sebelum waktu mulai.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={close}>Batal</button><button type="submit" className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" />}{saving ? "Menyimpan..." : "Simpan agenda"}</button></div></form></motion.div></motion.div>;
}

function ReminderDialog({ target, close, submit }: { target: { event: EventItem; reminder?: EventReminder }; close: () => void; submit: (value: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(formEvent: FormEvent<HTMLFormElement>) { formEvent.preventDefault(); setSaving(true); setError(""); const data = new FormData(formEvent.currentTarget); try { await submit(new Date(String(data.get("remindAt"))).toISOString()); } catch (caught) { setError(caught instanceof Error ? caught.message : "Pengingat belum dapat disimpan."); setSaving(false); } }
  const initial = target.reminder ? localDateTimeValue(target.reminder.remindAt) : localDateTimeValue(new Date(new Date(target.event.eventAt).getTime() - 60 * 60_000));
  return <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(pointer) => { if (pointer.target === pointer.currentTarget) close(); }}><motion.div className="dialog reminder-dialog" role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}><div className="dialog-heading"><div><p className="section-kicker">{target.event.title}</p><h2 id="reminder-dialog-title">{target.reminder ? "Edit pengingat" : "Tambah pengingat"}</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Tutup form"><X /></button></div><form onSubmit={onSubmit}><label>Ingatkan pada<input name="remindAt" type="datetime-local" required defaultValue={initial} max={localDateTimeValue(target.event.eventAt)} /></label><p className="field-help"><Clock3 aria-hidden="true" /> Pilih waktu sebelum agenda dimulai.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={close}>Batal</button><button type="submit" className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" />}{saving ? "Menyimpan..." : "Simpan pengingat"}</button></div></form></motion.div></motion.div>;
}
