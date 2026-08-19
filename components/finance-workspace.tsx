"use client";

import { Banknote, Bot, CalendarDays, Check, CheckSquare2, ChevronDown, Home, ListFilter, Loader2, Moon, Plus, Tags, Sun, Trash2, TrendingDown, TrendingUp, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, KeyboardEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { createCategory, createPocket, createTransaction, deleteTransaction } from "@/app/actions/transactions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/notification-center";
import { showToast } from "@/components/ui/toast-provider";
import { Category, LedgerTransaction, Pocket, TransactionType } from "@/lib/finance";

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const today = () => { const date = new Date(); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); };

export function FinanceWorkspace({ initialPockets, initialCategories, initialTransactions, userName }: { initialPockets: Pocket[]; initialCategories: Category[]; initialTransactions: LedgerTransaction[]; userName: string }) {
  const defaultDateTo = today();
  const defaultDateFrom = `${defaultDateTo.slice(0, 7)}-01`;
  const [pockets, setPockets] = useState(initialPockets);
  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dialog, setDialog] = useState<"transaction" | "pocket" | "category" | null>(null);
  const [pocketFilter, setPocketFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);

  useEffect(() => { const value = localStorage.getItem("orbita.theme") === "light" ? "light" : "dark"; document.documentElement.dataset.theme = value; queueMicrotask(() => setTheme(value)); }, []);
  const balances = useMemo(() => Object.fromEntries(pockets.map((pocket) => [pocket.id, pocket.startingBalance + transactions.filter((item) => item.pocketId === pocket.id).reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0)])), [pockets, transactions]);
  const visible = useMemo(() => transactions.filter((item) => (pocketFilter === "all" || item.pocketId === pocketFilter) && (typeFilter === "all" || item.type === typeFilter) && (categoryFilter === "all" || item.categoryId === categoryFilter) && (!dateFrom || item.transactionDate >= dateFrom) && (!dateTo || item.transactionDate <= dateTo)), [categoryFilter, dateFrom, dateTo, pocketFilter, transactions, typeFilter]);
  const groups = useMemo(() => Object.entries(visible.reduce<Record<string, LedgerTransaction[]>>((result, item) => { (result[item.transactionDate] ??= []).push(item); return result; }, {})), [visible]);
  const categoryName = (id: string | null) => categories.find((item) => item.id === id)?.name ?? "Tanpa kategori";
  const pocketName = (id: string) => pockets.find((item) => item.id === id)?.name ?? "Dompet";

  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("orbita.theme", next); }
  async function addPocket(input: { name: string; startingBalance: number }) { const saved = await createPocket(input); setPockets((current) => [...current, saved]); setDialog(null); showToast("success", "Dompet berhasil dibuat."); }
  async function addCategory(input: { name: string; type: TransactionType }) { const saved = await createCategory(input); setCategories((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name, "id"))); setDialog(null); showToast("success", "Kategori berhasil dibuat."); }
  async function addTransaction(input: Parameters<typeof createTransaction>[0]) { const saved = await createTransaction(input); setTransactions((current) => [saved, ...current]); setDialog(null); showToast("success", `${input.type === "income" ? "Pemasukan" : "Pengeluaran"} berhasil dicatat.`); }
  async function remove(id: string) { try { await deleteTransaction(id); setTransactions((current) => current.filter((item) => item.id !== id)); showToast("success", "Transaksi berhasil dihapus."); } catch (error) { showToast("error", error instanceof Error ? error.message : "Transaksi belum dapat dihapus."); } }

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Navigasi utama"><Link className="wordmark wordmark-link" href="/"><span className="orbit-mark"><span /></span><span>Orbita</span></Link><nav className="side-nav"><Link className="nav-item" href="/"><Home /><span>Hari ini</span></Link><Link className="nav-item" href="/"><CheckSquare2 /><span>Task</span></Link><Link className="nav-item" href="/events"><CalendarDays /><span>Agenda</span></Link><Link className="nav-item active" href="/finance" aria-current="page"><WalletCards /><span>Keuangan</span></Link><Link className="nav-item" href="/assistant"><Bot /><span>Asisten</span></Link></nav><div className="sidebar-footer"><p className="signed-in-user">Masuk sebagai <strong>{userName}</strong></p><button className="theme-toggle" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}<span>{theme === "dark" ? "Tema terang" : "Tema gelap"}</span></button><SignOutButton /></div></aside>
    <main className="workspace"><header className="topbar"><div><p className="eyebrow">Arus kas pribadi</p><h1>Keuangan</h1></div><div className="top-actions"><NotificationCenter /><button className="icon-button mobile-theme" onClick={toggleTheme} aria-label="Ganti tema">{theme === "dark" ? <Sun /> : <Moon />}</button><button className="secondary-button finance-pocket-button" onClick={() => setDialog("pocket")}><Plus /> Dompet</button><button className="primary-button" onClick={() => setDialog("transaction")}><Plus /> Transaksi</button></div></header>
      <section className="finance-summary" aria-label="Saldo dompet">{pockets.map((pocket) => <article key={pocket.id}><span>{pocket.name}</span><strong>{money(balances[pocket.id] ?? 0)}</strong><small>Saldo saat ini</small></article>)}</section>
      <section className="task-panel finance-panel"><div className="panel-heading"><div><p className="section-kicker">Catatan transaksi</p><h2>Riwayat harian</h2></div><button type="button" className="secondary-button compact-button" onClick={() => setDialog("category")}><Plus /> Kategori</button></div><div className="finance-filters"><SelectField label="Dompet" value={pocketFilter} onValueChange={setPocketFilter} options={[{ value: "all", label: "Semua dompet", icon: <WalletCards /> }, ...pockets.map((pocket) => ({ value: pocket.id, label: pocket.name, icon: <WalletCards /> }))]} /><SelectField label="Jenis" value={typeFilter} onValueChange={(value) => { setTypeFilter(value as typeof typeFilter); setCategoryFilter("all"); }} options={[{ value: "all", label: "Semua jenis", icon: <ListFilter /> }, { value: "income", label: "Pemasukan", icon: <TrendingUp /> }, { value: "expense", label: "Pengeluaran", icon: <TrendingDown /> }]} /><SelectField label="Kategori" value={categoryFilter} onValueChange={setCategoryFilter} options={[{ value: "all", label: "Semua kategori", icon: <Tags /> }, ...categories.filter((item) => typeFilter === "all" || item.type === typeFilter).map((item) => ({ value: item.id, label: item.name, icon: <Tags /> }))]} /><label className="date-filter-field">Dari<input type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value || defaultDateFrom)} /></label><label className="date-filter-field">Sampai<input type="date" value={dateTo} min={dateFrom} onChange={(event) => setDateTo(event.target.value || defaultDateTo)} /></label>{(pocketFilter !== "all" || typeFilter !== "all" || categoryFilter !== "all" || dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) && <button type="button" className="clear-finance-filters" onClick={() => { setPocketFilter("all"); setTypeFilter("all"); setCategoryFilter("all"); setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); }}>Reset filter</button>}</div>
        <WeeklyTrend transactions={visible} endDate={dateTo} />
        {groups.length === 0 ? <div className="state-card"><span className="empty-orbit"><WalletCards /></span><h3>Belum ada transaksi</h3><p>Catat pemasukan atau pengeluaran pertama untuk mulai menghitung saldo dompet.</p><button className="secondary-button" onClick={() => setDialog("transaction")}><Plus /> Catat transaksi</button></div> : <div className="transaction-groups">{groups.map(([date, items]) => { const incoming = items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0); const outgoing = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0); return <section key={date}><header><strong>{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</strong><span>Masuk {money(incoming)} · Keluar {money(outgoing)}</span></header>{items.map((item) => <article className="transaction-row" key={item.id}><span className={`transaction-icon ${item.type}`}>{item.type === "income" ? <TrendingUp /> : <TrendingDown />}</span><div><strong>{categoryName(item.categoryId)}</strong><p>{item.description || pocketName(item.pocketId)}</p><small>{pocketName(item.pocketId)}</small></div><strong className={item.type}>{item.type === "income" ? "+" : "-"}{money(item.amount)}</strong><button className="icon-button delete-button" onClick={() => remove(item.id)} aria-label="Hapus transaksi"><Trash2 /></button></article>)}</section>; })}</div>}
      </section></main>
    <nav className="bottom-nav"><Link href="/"><Home /><span>Hari ini</span></Link><Link href="/"><CheckSquare2 /><span>Task</span></Link><Link href="/events"><CalendarDays /><span>Agenda</span></Link><Link href="/finance" className="active"><WalletCards /><span>Keuangan</span></Link><Link href="/assistant"><Bot /><span>Asisten</span></Link></nav>
    {dialog === "transaction" && <TransactionDialog pockets={pockets} categories={categories} close={() => setDialog(null)} submit={addTransaction} />}{dialog === "pocket" && <PocketDialog close={() => setDialog(null)} submit={addPocket} />}{dialog === "category" && <CategoryDialog close={() => setDialog(null)} submit={addCategory} />}
  </div>;
}

function WeeklyTrend({ transactions, endDate }: { transactions: LedgerTransaction[]; endDate: string }) {
  const days = useMemo(() => {
    const end = new Date(`${endDate}T00:00:00Z`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setUTCDate(end.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const items = transactions.filter((item) => item.transactionDate === key);
      return { key, date, income: items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0), expense: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0) };
    });
  }, [endDate, transactions]);
  const max = Math.max(...days.flatMap((day) => [day.income, day.expense]), 0);
  const totalIncome = days.reduce((sum, day) => sum + day.income, 0);
  const totalExpense = days.reduce((sum, day) => sum + day.expense, 0);

  return <section className="weekly-trend" aria-labelledby="weekly-trend-title"><header><div><p className="section-kicker">Tujuh hari terakhir</p><h2 id="weekly-trend-title">Tren arus kas</h2></div><div className="trend-totals"><span><i className="income" />Masuk <strong>{money(totalIncome)}</strong></span><span><i className="expense" />Keluar <strong>{money(totalExpense)}</strong></span></div></header>{max === 0 ? <div className="trend-empty"><TrendingUp aria-hidden="true" /><p>Belum ada transaksi pada tujuh hari ini.</p></div> : <div className="trend-chart" role="img" aria-label={`Grafik tujuh hari. Total pemasukan ${money(totalIncome)}, total pengeluaran ${money(totalExpense)}.`}>{days.map((day) => <div className="trend-day" key={day.key}><div className="trend-bars"><span className="income" style={{ height: `${day.income / max * 100}%` }} title={`Pemasukan ${money(day.income)}`} /><span className="expense" style={{ height: `${day.expense / max * 100}%` }} title={`Pengeluaran ${money(day.expense)}`} /></div><span>{new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(day.date)}</span></div>)}</div>}</section>;
}

function TransactionDialog({ pockets, categories, close, submit }: { pockets: Pocket[]; categories: Category[]; close: () => void; submit: (value: Parameters<typeof createTransaction>[0]) => Promise<void> }) {
  const [type, setType] = useState<TransactionType>("expense"); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError(""); try { await submit({ pocketId: String(data.get("pocketId")), categoryId: String(data.get("categoryId")), type, amount: Number(data.get("amount")), description: String(data.get("description")), transactionDate: String(data.get("date")) }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Transaksi belum dapat disimpan."); setSaving(false); } }
  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="dialog"><div className="dialog-heading"><div><p className="section-kicker">Pocket ledger</p><h2>Catat transaksi</h2></div><button className="icon-button" onClick={close} aria-label="Tutup"><X /></button></div><form onSubmit={save}><div className="tabs" role="tablist"><button type="button" role="tab" aria-selected={type === "expense"} onClick={() => setType("expense")}>Pengeluaran</button><button type="button" role="tab" aria-selected={type === "income"} onClick={() => setType("income")}>Pemasukan</button></div><SelectField label="Dompet" name="pocketId" options={pockets.map((pocket) => ({ value: pocket.id, label: pocket.name, icon: <WalletCards /> }))} /><SelectField key={type} label="Kategori" name="categoryId" options={categories.filter((item) => item.type === type).map((item) => ({ value: item.id, label: item.name, icon: <Tags /> }))} /><RupiahInput name="amount" /><label>Tanggal<input name="date" type="date" defaultValue={today()} required /></label><label>Catatan (opsional)<textarea name="description" maxLength={1000} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={close}>Batal</button><button className="primary-button" disabled={saving || pockets.length === 0}>{saving && <Loader2 className="spin" />}{saving ? "Menyimpan..." : "Simpan transaksi"}</button></div></form></div></div>;
}

function RupiahInput({ name }: { name: string }) {
  const [digits, setDigits] = useState("");
  const formatted = digits ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(digits)) : "";

  return <label>Nominal<span className="currency-input"><Banknote aria-hidden="true" /><input type="text" inputMode="numeric" autoComplete="off" value={formatted} onChange={(event) => { const next = event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12); setDigits(next); }} required placeholder="Rp0" aria-describedby={`${name}-help`} /><input type="hidden" name={name} value={digits} /></span><small className="field-help" id={`${name}-help`}>Masukkan nominal tanpa pecahan.</small></label>;
}

type SelectOption = { value: string; label: string; icon: ReactNode };

function SelectField({ label, options, value, name, onValueChange }: { label: string; options: SelectOption[]; value?: string; name?: string; onValueChange?: (value: string) => void }) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? options[0]?.value ?? "");
  const requestedValue = value ?? internalValue;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === requestedValue));
  const selected = options[selectedIndex];
  const selectedValue = selected?.value ?? "";

  useEffect(() => { const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);

  function choose(next: string) { setInternalValue(next); onValueChange?.(next); setOpen(false); }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((current) => !current); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const offset = event.key === "ArrowDown" ? 1 : -1; const next = (selectedIndex + offset + options.length) % options.length; choose(options[next].value); setOpen(true); }
  }

  return <div className="select-field" ref={rootRef}><span className="select-label" id={`${id}-label`}>{label}</span><div className="select-control">{name && <input type="hidden" name={name} value={selectedValue} />}<button type="button" className="select-trigger" role="combobox" aria-labelledby={`${id}-label`} aria-controls={`${id}-listbox`} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((current) => !current)} onKeyDown={keyDown} disabled={options.length === 0}><span className="select-leading" aria-hidden="true">{selected?.icon ?? <ListFilter />}</span><span>{selected?.label ?? "Tidak ada pilihan"}</span><ChevronDown className="select-chevron" aria-hidden="true" /></button>{open && <div className="select-menu" id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}>{options.map((option) => <button type="button" role="option" aria-selected={option.value === selectedValue} className="select-option" key={option.value} onClick={() => choose(option.value)}><span aria-hidden="true">{option.icon}</span><span>{option.label}</span>{option.value === selectedValue && <Check aria-hidden="true" />}</button>)}</div>}</div></div>;
}

function PocketDialog({ close, submit }: { close: () => void; submit: (value: { name: string; startingBalance: number }) => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); try { await submit({ name: String(data.get("name")), startingBalance: Number(data.get("balance")) }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Dompet belum dapat dibuat."); setSaving(false); } }
  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="dialog"><div className="dialog-heading"><div><p className="section-kicker">Dompet baru</p><h2>Tambah dompet</h2></div><button className="icon-button" onClick={close}><X /></button></div><form onSubmit={save}><label>Nama dompet<input name="name" maxLength={100} required placeholder="Contoh: Dana darurat" /></label><label>Saldo awal<input name="balance" type="number" step="1" defaultValue="0" required /></label>{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={close}>Batal</button><button className="primary-button" disabled={saving}>{saving ? "Membuat..." : "Buat dompet"}</button></div></form></div></div>;
}

function CategoryDialog({ close, submit }: { close: () => void; submit: (value: { name: string; type: TransactionType }) => Promise<void> }) {
  const [type, setType] = useState<TransactionType>("expense");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError(""); try { await submit({ name: String(data.get("name")), type }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Kategori belum dapat dibuat."); setSaving(false); } }
  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="dialog category-dialog"><div className="dialog-heading"><div><p className="section-kicker">Kategori custom</p><h2>Tambah kategori</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Tutup"><X /></button></div><form onSubmit={save}><div className="tabs" role="tablist"><button type="button" role="tab" aria-selected={type === "expense"} onClick={() => setType("expense")}>Pengeluaran</button><button type="button" role="tab" aria-selected={type === "income"} onClick={() => setType("income")}>Pemasukan</button></div><label>Nama kategori<input name="name" required maxLength={100} autoFocus placeholder={type === "expense" ? "Contoh: Kesehatan" : "Contoh: Penjualan"} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={close} disabled={saving}>Batal</button><button type="submit" className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" />}{saving ? "Membuat..." : "Buat kategori"}</button></div></form></div></div>;
}
