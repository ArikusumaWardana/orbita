"use client";

import { ArrowDownLeft, ArrowUpRight, Bot, CalendarDays, CheckSquare2, Clock3, Home, MapPin, Moon, Plus, Sun, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/notification-center";

type TodayTask = { id: string; title: string; description: string | null; due_at: string };
type TodayEvent = { id: string; title: string; description: string | null; location: string | null; event_at: string; event_end_at: string | null };
type TodayTransaction = { id: string; type: "income" | "expense"; amount: number; description: string | null; transaction_date: string };

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function TodayWorkspace({ userName, timezone, referenceTime, tasks, events, transactions }: { userName: string; timezone: string; referenceTime: string; tasks: TodayTask[]; events: TodayEvent[]; transactions: TodayTransaction[] }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { const value = localStorage.getItem("orbita.theme") === "light" ? "light" : "dark"; document.documentElement.dataset.theme = value; queueMicrotask(() => setTheme(value)); }, []);
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("orbita.theme", next); }
  const now = useMemo(() => new Date(referenceTime), [referenceTime]);
  const localHour = Number(new Intl.DateTimeFormat("id-ID", { timeZone: timezone, hour: "2-digit", hour12: false }).format(now).slice(0, 2));
  const greeting = localHour < 11 ? "Selamat pagi" : localHour < 15 ? "Selamat siang" : localHour < 18 ? "Selamat sore" : "Selamat malam";
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const formatTime = (value: string) => new Intl.DateTimeFormat("id-ID", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Navigasi utama"><Link className="wordmark wordmark-link" href="/today"><span className="orbit-mark"><span /></span><span>Orbita</span></Link><nav className="side-nav"><Link className="nav-item active" href="/today" aria-current="page"><Home /><span>Hari ini</span></Link><Link className="nav-item" href="/"><CheckSquare2 /><span>Task</span></Link><Link className="nav-item" href="/events"><CalendarDays /><span>Agenda</span></Link><Link className="nav-item" href="/finance"><WalletCards /><span>Keuangan</span></Link><Link className="nav-item" href="/assistant"><Bot /><span>Asisten</span></Link></nav><div className="sidebar-footer"><p className="signed-in-user">Masuk sebagai <strong>{userName}</strong></p><button className="theme-toggle" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}<span>{theme === "dark" ? "Tema terang" : "Tema gelap"}</span></button><SignOutButton /></div></aside>
    <main className="workspace today-workspace">
      <header className="topbar"><div><p className="eyebrow">{new Intl.DateTimeFormat("id-ID", { timeZone: timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now)}</p><h1>{greeting}, {userName.split(" ")[0]}</h1></div><div className="top-actions"><NotificationCenter /><button className="icon-button mobile-theme" onClick={toggleTheme} aria-label="Ganti tema">{theme === "dark" ? <Sun /> : <Moon />}</button></div></header>

      <section className="today-metrics" aria-label="Ringkasan hari ini"><article><span>Task hari ini</span><strong>{tasks.length}</strong><small>{tasks.length ? "menunggu diselesaikan" : "tidak ada tenggat"}</small></article><article><span>Agenda hari ini</span><strong>{events.length}</strong><small>{events.length ? "aktif atau dimulai hari ini" : "jadwal masih kosong"}</small></article><article><span>Arus kas hari ini</span><strong className={income - expense < 0 ? "negative" : "positive"}>{money(income - expense)}</strong><small>masuk {money(income)} · keluar {money(expense)}</small></article></section>

      <div className="today-grid">
        <section className="today-card today-focus"><header><div><p className="section-kicker">Fokus utama</p><h2>Task hari ini</h2></div><Link href="/" className="text-link">Lihat semua</Link></header>{tasks.length === 0 ? <TodayEmpty icon={<CheckSquare2 />} title="Tidak ada task hari ini" copy="Gunakan waktu luang ini atau siapkan task untuk hari berikutnya." href="/" action="Buka task" /> : <ul>{tasks.map((task) => <li key={task.id}><span className="today-time"><Clock3 />{formatTime(task.due_at)}</span><div><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}</div></li>)}</ul>}</section>
        <section className="today-card today-agenda"><header><div><p className="section-kicker">Waktu terjadwal</p><h2>Agenda hari ini</h2></div><Link href="/events" className="text-link">Lihat semua</Link></header>{events.length === 0 ? <TodayEmpty icon={<CalendarDays />} title="Agenda masih kosong" copy="Belum ada kegiatan terjadwal untuk hari ini." href="/events" action="Tambah agenda" /> : <ul>{events.map((item) => <li key={item.id}><span className="today-time"><Clock3 />{formatTime(item.event_at)}{item.event_end_at ? `–${formatTime(item.event_end_at)}` : ""}</span><div><strong>{item.title}</strong>{item.location && <p><MapPin />{item.location}</p>}</div></li>)}</ul>}</section>
        <section className="today-card today-cash"><header><div><p className="section-kicker">Catatan harian</p><h2>Keuangan</h2></div><Link href="/finance" className="text-link">Buka ledger</Link></header><div className="today-cash-lines"><span><i className="income"><ArrowDownLeft /></i><small>Pemasukan</small><strong>{money(income)}</strong></span><span><i className="expense"><ArrowUpRight /></i><small>Pengeluaran</small><strong>{money(expense)}</strong></span></div></section>
        <section className="today-card today-shortcuts"><header><div><p className="section-kicker">Akses cepat</p><h2>Lanjutkan aktivitas</h2></div></header><div><Link href="/"><Plus /><span><strong>Buka task</strong><small>Atur pekerjaan berikutnya</small></span></Link><Link href="/events"><CalendarDays /><span><strong>Buka agenda</strong><small>Periksa jadwal kegiatan</small></span></Link><Link href="/finance"><WalletCards /><span><strong>Buka keuangan</strong><small>Perbarui arus kas</small></span></Link><Link href="/assistant"><Bot /><span><strong>Tanya asisten</strong><small>Periksa data Orbita</small></span></Link></div></section>
      </div>
    </main>
    <nav className="bottom-nav" aria-label="Navigasi mobile"><Link href="/today" className="active"><Home /><span>Hari ini</span></Link><Link href="/"><CheckSquare2 /><span>Task</span></Link><Link href="/events"><CalendarDays /><span>Agenda</span></Link><Link href="/finance"><WalletCards /><span>Keuangan</span></Link><Link href="/assistant"><Bot /><span>Asisten</span></Link></nav>
  </div>;
}

function TodayEmpty({ icon, title, copy, href, action }: { icon: React.ReactNode; title: string; copy: string; href: string; action: string }) {
  return <div className="today-empty"><span>{icon}</span><strong>{title}</strong><p>{copy}</p><Link href={href}>{action}</Link></div>;
}
