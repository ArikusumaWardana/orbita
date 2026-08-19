"use client";

import { Bot, CalendarDays, CheckSquare2, Clock3, Home, Loader2, Moon, RotateCcw, Send, Sun, Trash2, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { clearConversationHistory } from "@/app/actions/assistant";
import { createEventWithAdditionalReminders } from "@/app/actions/events";
import { createTask } from "@/app/actions/tasks";
import { createTransaction } from "@/app/actions/transactions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { showToast } from "@/components/ui/toast-provider";
import { AssistantMessage, AssistantStreamEvent, AssistantSuggestion } from "@/lib/assistant";
import { Category, Pocket, TransactionType } from "@/lib/finance";

const suggestions = [
  "Task apa yang perlu saya kerjakan minggu ini?",
  "Berapa pengeluaran saya selama 30 hari terakhir?",
  "Agenda apa yang paling dekat?",
];

export function AssistantWorkspace({ initialMessages, initialRemaining, pockets, categories, userName }: { initialMessages: AssistantMessage[]; initialRemaining: number; pockets: Pocket[]; categories: Category[]; userName: string }) {
  const [messages, setMessages] = useState(initialMessages);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [suggestion, setSuggestion] = useState<AssistantSuggestion | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const value = localStorage.getItem("orbita.theme") === "light" ? "light" : "dark"; document.documentElement.dataset.theme = value; queueMicrotask(() => setTheme(value)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  useEffect(() => {
    if (!confirmClear) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setConfirmClear(false); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmClear]);
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("orbita.theme", next); }

  async function sendMessage(value: string) {
    const message = value.trim();
    if (!message || sending || remaining <= 0) return;
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: message, createdAt: new Date().toISOString() };
    const assistantId = crypto.randomUUID();
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);
    setDraft("");
    setSuggestion(null);
    setSending(true);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "Asisten belum dapat menjawab.");
      }
      setRemaining((current) => Math.max(0, current - 1));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedText = false;
      let buffer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as AssistantStreamEvent;
          if (event.type === "text") {
            receivedText = true;
            setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content + event.value } : item));
          } else if (event.type === "suggestion") setSuggestion(event.value);
        }
      }
      if (!receivedText) throw new Error("Asisten tidak mengirim jawaban. Coba tulis pertanyaan dengan cara lain.");
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== assistantId));
      const message = error instanceof Error ? error.message : "Asisten belum dapat menjawab.";
      showToast("error", message);
    } finally { setSending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(draft); }

  async function clearHistory() {
    setClearing(true);
    try {
      await clearConversationHistory();
      setMessages([]);
      setSuggestion(null);
      setConfirmClear(false);
      showToast("success", "Percakapan berhasil dikosongkan.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Percakapan belum dapat dikosongkan.");
    } finally { setClearing(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Navigasi utama">
      <Link className="wordmark wordmark-link" href="/today"><span className="orbit-mark"><span /></span><span>Orbita</span></Link>
      <nav className="side-nav"><Link className="nav-item" href="/today"><Home /><span>Hari ini</span></Link><Link className="nav-item" href="/"><CheckSquare2 /><span>Task</span></Link><Link className="nav-item" href="/events"><CalendarDays /><span>Agenda</span></Link><Link className="nav-item" href="/finance"><WalletCards /><span>Keuangan</span></Link><Link className="nav-item active" href="/assistant" aria-current="page"><Bot /><span>Asisten</span></Link></nav>
      <div className="sidebar-footer"><p className="signed-in-user">Masuk sebagai <strong>{userName}</strong></p><button className="theme-toggle" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}<span>{theme === "dark" ? "Tema terang" : "Tema gelap"}</span></button><SignOutButton /></div>
    </aside>
    <main className="workspace assistant-workspace">
      <header className="topbar"><div><p className="eyebrow">Konteks akunmu</p><h1>Asisten</h1></div><div className="top-actions"><span className="assistant-limit">{remaining} pertanyaan tersisa</span><button type="button" className="secondary-button assistant-reset" onClick={() => setConfirmClear(true)} disabled={messages.length === 0 || sending || clearing} aria-label="Mulai percakapan baru"><RotateCcw aria-hidden="true" /><span>Percakapan baru</span></button><button className="icon-button mobile-theme" onClick={toggleTheme} aria-label="Ganti tema">{theme === "dark" ? <Sun /> : <Moon />}</button></div></header>
      <section className="assistant-panel" aria-label="Percakapan dengan asisten Orbita">
        <div className="assistant-context-note"><Bot aria-hidden="true" /><p><strong>Jawaban berdasarkan data Orbita milikmu.</strong><span>Asisten dapat membaca ringkasan task, agenda, dan keuangan. Saran tidak akan mengubah data tanpa konfirmasi.</span></p></div>
        <div className="assistant-messages" aria-live="polite">
          {messages.length === 0 && <div className="assistant-empty"><span className="empty-orbit"><Bot /></span><h2>Apa yang ingin kamu periksa?</h2><p>Tanyakan rencana minggu ini, agenda terdekat, atau ringkasan pengeluaranmu.</p><div className="assistant-suggestions">{suggestions.map((item) => <button type="button" key={item} onClick={() => void sendMessage(item)}>{item}</button>)}</div></div>}
          {messages.map((item) => <article className={`assistant-message ${item.role}`} key={item.id}><span>{item.role === "user" ? "Kamu" : "Orbita"}</span><div>{!item.content && sending ? <span className="assistant-thinking"><Loader2 className="spin" /> Menyusun jawaban...</span> : item.content}</div></article>)}
          {suggestion && <ActionDraftCard key={JSON.stringify(suggestion)} suggestion={suggestion} pockets={pockets} categories={categories} dismiss={() => setSuggestion(null)} confirmed={() => setSuggestion(null)} />}
          <div ref={endRef} />
        </div>
        <form className="assistant-composer" onSubmit={submit}><label htmlFor="assistant-message">Tulis pertanyaan</label><div><textarea id="assistant-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Contoh: Berapa pengeluaran terbesar saya bulan ini?" disabled={sending || remaining <= 0} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="primary-button" disabled={sending || !draft.trim() || remaining <= 0} aria-label="Kirim pertanyaan">{sending ? <Loader2 className="spin" /> : <Send />}</button></div><small>{remaining > 0 ? "Enter untuk mengirim, Shift + Enter untuk baris baru." : "Batas harian sudah tercapai."}</small></form>
      </section>
    </main>
    <nav className="bottom-nav" aria-label="Navigasi mobile"><Link href="/today"><Home /><span>Hari ini</span></Link><Link href="/"><CheckSquare2 /><span>Task</span></Link><Link href="/events"><CalendarDays /><span>Agenda</span></Link><Link href="/finance"><WalletCards /><span>Keuangan</span></Link><Link href="/assistant" className="active"><Bot /><span>Asisten</span></Link></nav>
    {confirmClear && <div className="dialog-backdrop confirm-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmClear(false)}><div className="dialog confirm-dialog assistant-clear-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-chat-title" aria-describedby="clear-chat-description"><span className="confirm-icon"><Trash2 aria-hidden="true" /></span><div><div className="dialog-heading"><div><p className="section-kicker">Histori percakapan</p><h2 id="clear-chat-title">Mulai percakapan baru?</h2></div><button type="button" className="icon-button" autoFocus onClick={() => setConfirmClear(false)} aria-label="Tutup konfirmasi"><X /></button></div><p id="clear-chat-description">Semua pesan sebelumnya akan dihapus dari akunmu. Limit pertanyaan harian tidak berubah.</p><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setConfirmClear(false)} disabled={clearing}>Batal</button><button type="button" className="danger-button" onClick={() => void clearHistory()} disabled={clearing}>{clearing && <Loader2 className="spin" />}{clearing ? "Mengosongkan..." : "Kosongkan percakapan"}</button></div></div></div></div>}
  </div>;
}

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ActionDraftCard({ suggestion, pockets, categories, dismiss, confirmed }: { suggestion: AssistantSuggestion; pockets: Pocket[]; categories: Category[]; dismiss: () => void; confirmed: () => void }) {
  const [draft, setDraft] = useState(suggestion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (draft.type === "task") await createTask({ title: draft.title, description: draft.description, dueAt: draft.dueAt });
      if (draft.type === "event") await createEventWithAdditionalReminders({ title: draft.title, description: draft.description, location: draft.location, eventAt: draft.eventAt, eventEndAt: draft.eventEndAt }, draft.reminders);
      if (draft.type === "transaction") await createTransaction({ pocketId: draft.pocketId, categoryId: draft.categoryId, type: draft.transactionType, amount: draft.amount, description: draft.description, transactionDate: draft.transactionDate });
      const label = draft.type === "task" ? "Task" : draft.type === "event" ? "Agenda" : "Transaksi";
      showToast("success", `${label} berhasil dibuat.`);
      confirmed();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Draft belum dapat disimpan.");
      setSaving(false);
    }
  }

  return <form className="assistant-action-card" onSubmit={save}>
    <header><div><span className="assistant-action-icon">{draft.type === "task" ? <CheckSquare2 /> : draft.type === "event" ? <CalendarDays /> : <WalletCards />}</span><div><small>Saran aksi</small><strong>{draft.type === "task" ? "Buat task" : draft.type === "event" ? "Buat agenda" : "Catat transaksi"}</strong></div></div><button type="button" className="icon-button" onClick={dismiss} aria-label="Batalkan saran"><X /></button></header>
    <p>Periksa dan ubah detail jika perlu. Data baru dibuat setelah kamu menekan tombol konfirmasi.</p>
    <div className="assistant-action-fields">
      {draft.type === "task" && <><label>Judul<input value={draft.title} maxLength={200} required onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Catatan<textarea value={draft.description} maxLength={2000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Jatuh tempo<span className="action-date-input"><Clock3 /><input type="datetime-local" value={localDateTime(draft.dueAt)} required onChange={(event) => setDraft({ ...draft, dueAt: new Date(event.target.value).toISOString() })} /></span></label></>}
      {draft.type === "event" && <><label>Judul<input value={draft.title} maxLength={200} required onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Catatan<textarea value={draft.description} maxLength={2000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Lokasi<input value={draft.location} maxLength={300} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><div className="assistant-action-row"><label>Mulai<input type="datetime-local" value={localDateTime(draft.eventAt)} required onChange={(event) => setDraft({ ...draft, eventAt: new Date(event.target.value).toISOString() })} /></label><label>Selesai (opsional)<input type="datetime-local" value={draft.eventEndAt ? localDateTime(draft.eventEndAt) : ""} min={localDateTime(draft.eventAt)} onChange={(event) => setDraft({ ...draft, eventEndAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label></div><div className="assistant-reminder-editor"><div><span>Pengingat tambahan</span><button type="button" onClick={() => setDraft({ ...draft, reminders: [...draft.reminders, new Date(new Date(draft.eventAt).getTime() - 60 * 60_000).toISOString()].slice(0, 10) })} disabled={draft.reminders.length >= 10}>Tambah pengingat</button></div><p>Pengingat bawaan 10 menit sebelum agenda tetap dibuat otomatis.</p>{draft.reminders.length === 0 ? <small>Belum ada pengingat tambahan.</small> : draft.reminders.map((reminder, index) => <div className="assistant-reminder-row" key={`${reminder}-${index}`}><input type="datetime-local" value={localDateTime(reminder)} max={localDateTime(draft.eventAt)} aria-label={`Waktu pengingat tambahan ${index + 1}`} onChange={(event) => { if (!event.target.value) return; const reminders = [...draft.reminders]; reminders[index] = new Date(event.target.value).toISOString(); setDraft({ ...draft, reminders }); }} /><button type="button" className="icon-button" onClick={() => setDraft({ ...draft, reminders: draft.reminders.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Hapus pengingat tambahan ${index + 1}`}><Trash2 /></button></div>)}</div></>}
      {draft.type === "transaction" && <TransactionDraftFields draft={draft} setDraft={setDraft} pockets={pockets} categories={categories} />}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <footer><button type="button" className="secondary-button" onClick={dismiss} disabled={saving}>Batalkan</button><button type="submit" className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" />}{saving ? "Menyimpan..." : "Konfirmasi dan buat"}</button></footer>
  </form>;
}

function TransactionDraftFields({ draft, setDraft, pockets, categories }: { draft: Extract<AssistantSuggestion, { type: "transaction" }>; setDraft: (value: Extract<AssistantSuggestion, { type: "transaction" }>) => void; pockets: Pocket[]; categories: Category[] }) {
  const matchingCategories = categories.filter((item) => item.type === draft.transactionType);
  function changeType(type: TransactionType) { setDraft({ ...draft, transactionType: type, categoryId: categories.find((item) => item.type === type)?.id ?? "" }); }
  return <><div className="assistant-action-row"><label>Jenis<select value={draft.transactionType} onChange={(event) => changeType(event.target.value as TransactionType)}><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label><label>Nominal<input type="number" min="1" step="1" value={draft.amount} required onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label></div><div className="assistant-action-row"><label>Dompet<select value={draft.pocketId} required onChange={(event) => setDraft({ ...draft, pocketId: event.target.value })}>{pockets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Kategori<select value={draft.categoryId} required onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{matchingCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><label>Tanggal<input type="date" value={draft.transactionDate} required onChange={(event) => setDraft({ ...draft, transactionDate: event.target.value })} /></label><label>Catatan<textarea value={draft.description} maxLength={1000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label></>;
}
