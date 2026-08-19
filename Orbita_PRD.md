# Product Requirements Document (PRD)
## Personal Dashboard & Productivity Hub

**Versi:** 1.2 (Neon Auth diperbarui ke Managed Better Auth dengan verifikasi OTP)
**Status:** Draft untuk review
**Terakhir diperbarui:** 19 Agustus 2026

---

## 0. Saran Nama Produk

| # | Nama | Rasional |
|---|------|----------|
| 1 | **Orbita** | Menyiratkan "pusat" tempat semua aktivitas (task, event, keuangan) berputar mengelilingi satu titik. Singkat, mudah diucapkan, domain-friendly. |
| 2 | **Fluxo** | Dari kata "flux" — cocok untuk merepresentasikan arus kerja & arus kas (income/expense) sekaligus. Modern, cocok untuk brand SaaS. |
| 3 | **Basecamp Harian** *(alternatif deskriptif)* — diganti dengan **Harmoni** | "Harmoni" antara task, jadwal, dan keuangan — mudah diingat oleh pengguna Indonesia, terasa personal. |
| 4 | **Kanvas** | Diri sebagai "kanvas kosong" untuk menyusun hari — netral, elegan, cocok dengan tone minimalis dashboard. |
| 5 | **Nadi** | Bahasa Indonesia untuk "pulse/denyut" — merepresentasikan ritme hidup produktif harian. Unik dan berkarakter lokal. |

**Rekomendasi utama: Orbita** — nama pendek (3 suku kata), mudah dibuat logo (ikon orbit/planet cocok dengan estetika dashboard gelap di referensi), dan scalable jika suatu saat produk berkembang jadi multi-modul (Orbita Finance, Orbita Tasks, dst).

> Nama produk berikut di dokumen ini menggunakan placeholder **"Orbita"**. Ganti sesuai keputusan final.

---

## 1. Ringkasan Produk

Orbita adalah personal dashboard & productivity hub berbasis web (PWA) yang menyatukan tiga kebutuhan harian pengguna individu: **manajemen tugas (to-do)**, **pengingat agenda/event**, dan **pencatatan keuangan pribadi sederhana (pocket ledger)** — dilengkapi asisten AI kontekstual yang hanya "melihat" data milik pengguna yang sedang login.

### 1.1 Tujuan Produk
- Menjadi satu tempat (single pane of glass) untuk mengelola waktu dan uang harian tanpa kompleksitas tools enterprise.
- Memberi pengalaman visual yang tenang, cepat, dan personal (bukan dashboard analitik korporat yang padat data).
- Menyediakan asisten AI yang benar-benar berguna karena tahu konteks data pengguna, bukan chatbot generik.

### 1.2 Target Pengguna
- Individu produktif (freelancer, mahasiswa, karyawan) yang ingin menggabungkan to-do list + kalender + catatan kas pribadi dalam satu aplikasi ringan.
- Pengguna yang nyaman dengan self-service SaaS kecil, mobile-first, tanpa perlu tim/kolaborasi (single-user per akun, tidak ada shared workspace di v1).

### 1.3 Non-Goals (di luar scope v1)
- Tidak ada integrasi payment gateway/bank riil (murni pencatatan manual).
- Tidak ada kolaborasi multi-user/team dalam satu board.
- Tidak ada aplikasi native iOS/Android (cukup PWA installable).

---

## 2. Tech Stack & Arsitektur Tingkat Tinggi

| Layer | Teknologi | Catatan |
|---|---|---|
| Frontend | Next.js 16 (App Router), React Server Components | Route groups: `(auth)`, `(dashboard)` |
| Styling | Tailwind CSS + shadcn/ui (base) | Lihat DESIGN.md |
| Animasi | Framer Motion | Transisi halaman, drag-and-drop, micro-interaction |
| State (client) | Zustand / React Query (TanStack Query) | Query untuk data server, Zustand untuk UI state lokal (mis. drag state) |
| Backend/DB | **Neon** (Serverless Postgres, branching, scale-to-zero) | Single source of truth — Postgres murni, kompatibel dengan RLS standar |
| Auth | **Neon Auth** (Managed Better Auth, terintegrasi native dengan Neon) | Email+password, verifikasi OTP email, JWT otomatis untuk RLS |
| Otorisasi Data | **Neon Data API + Postgres RLS** | Data API memvalidasi JWT Neon Auth dan menyediakan `auth.user_id()` untuk policy kepemilikan |
| Notifikasi | Web Push API + Service Worker (`next-pwa`/custom SW) + **Vercel Cron Jobs** (pengganti pg_cron) | Lihat §6 |
| AI | Google Gemini Flash API (via **Next.js Route Handler** sebagai proxy, dijalankan di Vercel serverless/Edge runtime) | Lihat §7 |
| Realtime (opsional) | Polling ringan via React Query (`refetchInterval`) untuk MVP; upgrade ke **Pusher Channels** / **Ably** (free tier) jika butuh push real-time sungguhan | Neon tidak punya Realtime bawaan seperti Supabase |
| Hosting | Vercel (frontend + serverless functions) + Neon Cloud | — |
| Icon | Lucide React | Konsisten dengan referensi desain (line icons) |

> **Kenapa pindah dari Supabase ke Neon:** Neon adalah Postgres murni, sehingga skema DDL dan RLS tetap dapat digunakan. Identitas user dibaca melalui `auth.user_id()` dari extension `pg_session_jwt`, sedangkan foreign key user mengarah ke `neon_auth."user"` milik Managed Better Auth. Realtime dan Edge Functions/pg_cron digantikan oleh layanan yang dijelaskan di atas. Lihat panduan setup lengkap di §10.

### 2.1 Prinsip Arsitektur
1. **RLS-first**: setiap tabel data pengguna WAJIB punya RLS policy berbasis `auth.user_id()`; request data user melewati Neon Data API dengan JWT Neon Auth, bukan role owner/admin.
2. **Server Actions untuk mutasi**: semua create/update/delete task, event, transaksi dilakukan lewat Next.js Server Actions yang memanggil Neon Data API dengan JWT sesi user (bukan client-side langsung ke DB untuk operasi kritikal) — memudahkan validasi & audit.
3. **Route Handler sebagai AI gateway**: client tidak pernah memanggil Gemini API langsung (API key tidak boleh exposed); semua request AI lewat Next.js Route Handler (`app/api/ai/route.ts`) yang melakukan verifikasi JWT + context-fetch + guardrail + logging, dijalankan sebagai serverless function di Vercel (bukan lagi Supabase Edge Function).
4. **Dua jalur koneksi ke Neon**: (a) Neon Data API dengan JWT Neon Auth untuk semua request atas nama user dan (b) koneksi owner yang **hanya** dipakai di server-side trusted context seperti cron job notifikasi, tidak pernah diexpose ke client.
5. **Optimistic UI** untuk drag-and-drop to-do agar terasa instan, dengan rollback jika mutasi gagal.

---

## 3. Fitur — User Stories & Acceptance Criteria

### 3.1 Fitur 1: To-Do List System

**User Stories**
- Sebagai pengguna, saya ingin membuat task baru dengan judul, deskripsi opsional, tanggal, dan jam, agar saya bisa merencanakan pekerjaan saya.
- Sebagai pengguna, saya ingin tanggal/jam otomatis terisi ke waktu saat ini jika saya tidak mengubahnya, agar input cepat untuk task "hari ini".
- Sebagai pengguna, saya ingin drag-and-drop untuk mengurutkan ulang prioritas task, agar saya bisa menyusun urutan kerja sesuai kebutuhan saya secara visual.
- Sebagai pengguna, saya ingin melihat riwayat task yang sudah selesai, dikelompokkan per hari, agar saya bisa mengevaluasi produktivitas saya.
- Sebagai pengguna, saya ingin mendapat notifikasi saat task mendekati deadline, agar saya tidak lupa mengerjakannya.

**Acceptance Criteria**
- [ ] Form task memiliki field: `title` (wajib, max 200 char), `description` (opsional, max 2000 char), `due_date`, `due_time`.
- [ ] Default `due_date`/`due_time` = `now()` pada timezone lokal browser saat form dibuka, tapi dapat diubah bebas.
- [ ] Task list mendukung drag-and-drop reorder (menggunakan `order_index` sebagai kolom pengurutan), perubahan tersimpan otomatis (debounced) setelah drop.
- [ ] Task yang di-mark selesai berpindah ke tab "History", dikelompokkan berdasarkan `completed_at::date`, diurutkan dari terbaru.
- [ ] Sistem mengirim notifikasi (push + in-app) pada threshold yang dapat dikonfigurasi (default: 60 menit & 10 menit sebelum `due_date + due_time`), hanya untuk task berstatus `pending`.
- [ ] User dapat undo "mark as complete" dalam 5 detik (toast dengan tombol undo).
- [ ] Empty state, loading skeleton, dan error state tersedia untuk semua interaksi list.

---

### 3.2 Fitur 2: Event Reminder

**User Stories**
- Sebagai pengguna, saya ingin membuat event dengan nama, deskripsi opsional, tanggal, dan jam, agar saya bisa mencatat agenda penting (meeting, janji, dll).
- Sebagai pengguna, saya ingin mengatur waktu reminder custom (bukan hanya default), agar saya bisa diingatkan lebih awal untuk event penting (misal: H-1).
- Sebagai pengguna, saya secara default ingin diingatkan 10 menit sebelum event dimulai tanpa harus mengatur manual.

**Acceptance Criteria**
- [ ] Form event: `title` (wajib), `description` (opsional), `event_date`, `event_time`, `location` (opsional, nice-to-have).
- [ ] Setiap event otomatis membuat 1 reminder default di `event_reminders` dengan `remind_at = event_datetime - interval '10 minutes'`.
- [ ] User dapat menambah reminder tambahan (custom tanggal+jam bebas, bisa lebih dari satu, misal H-1 jam 08:00 & H-0 10 menit sebelum).
- [ ] User dapat menghapus/mengedit reminder individual tanpa menghapus event induk.
- [ ] Event yang sudah lewat (`event_datetime < now()`) otomatis dipindah ke tampilan "Past Events" (read-only, tidak trigger notifikasi baru).
- [ ] Kalender view (bulanan) menampilkan dot indicator pada tanggal yang memiliki event/task.

---

### 3.3 Fitur 3: Income & Expense Tracker (Digital Pocket Ledger)

**User Stories**
- Sebagai pengguna, saya ingin mencatat transaksi masuk/keluar beserta kategori dan deskripsi, agar saya bisa memantau arus kas pribadi.
- Sebagai pengguna, saya ingin melihat saldo saat ini terhitung otomatis secara real-time, agar saya tahu kondisi keuangan saya tanpa hitung manual.
- Sebagai pengguna, saya ingin melihat riwayat transaksi dikelompokkan per hari, agar mudah ditelusuri.
- Sebagai pengguna, saya ingin mengelola beberapa "pocket"/dompet terpisah (misal: Tabungan, Uang Jajan, Dana Darurat), agar pencatatan lebih terstruktur.

**Acceptance Criteria**
- [ ] Konsep `pockets` (dompet virtual): user dapat membuat >1 pocket, masing-masing punya `name`, `starting_balance`, `currency` (default IDR).
- [ ] Transaksi: `type` (`income` | `expense`), `amount` (> 0, divalidasi di DB via `CHECK`), `category`, `description` (opsional), `transaction_date`, `pocket_id`.
- [ ] Saldo pocket dihitung sebagai **view/derived value** (bukan kolom yang bisa stale): `starting_balance + SUM(income) - SUM(expense)`, dihitung via SQL view atau computed di query, bukan disimpan sebagai kolom mutable di tabel pocket (mencegah drift).
- [ ] Riwayat transaksi dikelompokkan per `transaction_date` (descending), dengan subtotal in/out per hari ditampilkan di header grup.
- [ ] Kategori dapat dipilih dari daftar preset (Makanan, Transport, Gaji, Tagihan, dll) atau custom oleh user (tabel `categories` per user, bukan hardcode).
- [ ] Filter berdasarkan rentang tanggal, pocket, kategori, dan tipe transaksi.
- [ ] Grafik ringkas (line/bar chart mingguan) untuk tren income vs expense — mengikuti gaya visual referensi (sparkline di kartu metrik).

---

### 3.4 Fitur 4: Authentication & User Management

**User Stories**
- Sebagai pengguna baru, saya ingin mendaftar dengan email & password, lalu memverifikasi email saya sebelum bisa login, agar akun saya aman dan tervalidasi.
- Sebagai pengguna, saya ingin login dengan email & password yang sudah terverifikasi.
- Sebagai pengguna, saya ingin bisa reset password jika lupa.

**Acceptance Criteria**
- [ ] Registrasi menggunakan Managed Better Auth SDK (`@neondatabase/auth`) dengan email + password (min 8 karakter, kombinasi huruf & angka, divalidasi di client dan server).
- [ ] Setelah signup, Neon Auth mengirim kode OTP verifikasi ke email pengguna melalui shared email provider.
- [ ] User tidak dapat login sebelum email terverifikasi dan diarahkan ke halaman input OTP dengan aksi kirim ulang yang memiliki rate limit.
- [ ] Kode OTP bersifat sekali pakai dan kedaluwarsa mengikuti konfigurasi Managed Better Auth.
- [ ] Setelah OTP terverifikasi dan pengguna pertama kali login, Server Action onboarding membuat profile, satu pocket default ("Dompet Utama"), dan kategori default secara idempotent.
- [ ] Flow "Forgot Password" menggunakan API password reset Managed Better Auth dan email transaksional Neon Auth.
- [ ] Session management menggunakan signed HTTP-only cookie dari `@neondatabase/auth`, kompatibel dengan Server Components dan Middleware Next.js.

---

### 3.5 Fitur 5: Context-Aware AI Assistant (Gemini Flash)

**User Stories**
- Sebagai pengguna, saya ingin bertanya ke AI Assistant tentang task/event/keuangan saya ("Berapa total pengeluaran minggu ini?", "Task apa yang belum selesai hari ini?"), dan mendapat jawaban akurat berdasarkan data saya sendiri.
- Sebagai pengguna, saya ingin AI memberi saran/rekomendasi (misal: prioritas task, potensi pemborosan kategori pengeluaran), bukan sekadar menjawab data mentah.
- Sebagai pengguna, saya tidak ingin AI membahas topik di luar produktivitas/keuangan pribadi saya (menjaga fokus & mencegah misuse).

**Acceptance Criteria**
- [ ] Setiap request AI membawa `user_id` dari sesi Neon Auth yang terautentikasi; Route Handler mem-fetch data **hanya** milik `auth.user_id()` yang sama (RLS via koneksi role `authenticated` + filter eksplisit di query sebagai defense-in-depth).
- [ ] Context yang di-inject ke prompt: ringkasan task pending (7 hari ke depan), event mendatang (7 hari ke depan), ringkasan transaksi (30 hari terakhir + saldo per pocket) — bukan seluruh histori mentah (batasi ukuran context, lihat §7.2).
- [ ] Guardrail: system prompt secara eksplisit membatasi topik ke to-do/event/finansial user; permintaan di luar topik (coding, trivia umum, dll) direspons dengan penolakan sopan + redirect ke fitur yang didukung.
- [ ] AI dapat melakukan **structured action suggestion** (misal: "Ingin saya buatkan task untuk ini?") tapi **tidak boleh langsung memodifikasi data** tanpa konfirmasi eksplisit user (human-in-the-loop untuk semua mutasi berbasis AI).
- [ ] Riwayat chat per user disimpan (opsional, untuk continuity), juga dengan RLS agar chat user A tidak terbaca user B.
- [ ] Rate limiting per user (misal: 30 request/hari untuk tier gratis) untuk mengontrol biaya API.

---

## 4. Product Enhancement Suggestions (Arsitektur/UX per Fitur)

### 4.1 To-Do List
- **Kanban ringan opsional**: selain list linear dengan drag-reorder, sediakan toggle view "Today / Upcoming / Someday" ala Things3 agar task tanpa tanggal tetap punya tempat.
- **Soft-delete + trash**: jangan hard-delete task; gunakan `deleted_at` agar user bisa restore & agar data untuk AI Assistant tetap konsisten secara historis.
- **Subtasks/checklist** (v1.1): kolom `parent_task_id` self-referencing untuk breakdown task besar.
- **Keyboard shortcuts** (`n` new task, `cmd+enter` submit) untuk power user — selaras dengan estetika dashboard minimalis di referensi.

### 4.2 Event Reminder
- **Recurring events** (v1.1): kolom `recurrence_rule` (RRULE string, standar iCal) agar event mingguan/bulanan tidak perlu dibuat manual berulang.
- **Timezone-aware storage**: simpan semua waktu dalam `timestamptz` (UTC) di DB, konversi ke timezone browser di client — krusial karena Next.js SSR & Neon server berbeda timezone dari user.
- **Google Calendar-style month grid** sebagai landing view (bukan cuma list), dengan dot density indicator sesuai jumlah item per tanggal — cocok dengan referensi calendar picker minimalis yang di-share.

### 4.3 Income & Expense Tracker
- **Derived balance via SQL VIEW**, bukan trigger yang menulis ulang kolom — mengurangi race condition saat banyak transaksi dibuat cepat berurutan.
- **Budget cap per kategori** (v1.1): user set limit bulanan per kategori, progress bar visual (mirip kartu metrik "Add to Cart Rate" di referensi — angka besar + delta % + mini chart).
- **Multi-currency ringan**: simpan `currency` per pocket, tampilkan konversi read-only jika diperlukan (tanpa real-time FX API di v1, cukup manual rate).
- **Export CSV** untuk laporan bulanan sederhana.

### 4.4 Auth & User Management
- **Magic link login** sebagai alternatif password melalui plugin Managed Better Auth, setelah aplikasi memakai SMTP khusus yang mendukung link email.
- **Rate limiting resend verification** untuk mencegah abuse endpoint email.
- **Onboarding checklist** setelah verifikasi: 3 langkah singkat (buat task pertama, buat pocket, coba tanya AI) — meningkatkan activation rate.

### 4.5 AI Assistant
- **Function calling / structured tool-use** dengan Gemini (bukan pure text generation) untuk query data agar jawaban numerik selalu akurat (AI memanggil "tool" `get_expense_summary(date_range)` alih-alih menghitung sendiri dari teks — mencegah halusinasi angka).
- **Streaming response** (SSE) dari Edge Function ke client agar terasa responsif seperti di referensi UI (bubble chat dengan efek "Thinking...").
- **Konteks ringkas terkompresi**: gunakan agregasi SQL (SUM, COUNT, GROUP BY) sebelum masuk prompt, bukan raw rows — hemat token & lebih akurat.
- **Audit log AI**: simpan setiap prompt+response (metadata saja jika perlu privasi) untuk debugging guardrail & evaluasi kualitas.

---

## 5. Database Schema Design (Neon / PostgreSQL DDL)

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- pg_session_jwt: menyediakan auth.user_id() & auth.session() untuk RLS,
-- diaktifkan otomatis saat Neon RLS Authorize di-enable dari dashboard
-- (Project → RLS Authorize → Connect provider: Neon Auth). Baris di bawah
-- untuk jaga-jaga jika perlu instalasi manual.
create extension if not exists "pg_session_jwt";

-- ============================================================
-- PROFILES (referensi ke tabel user Managed Better Auth)
-- ============================================================
create table public.profiles (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'Asia/Jakarta',
  ai_daily_request_count int not null default 0,
  ai_request_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.user_id() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.user_id() = id);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  due_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','completed')),
  order_index numeric not null default 0,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_user_status on public.tasks(user_id, status) where deleted_at is null;
create index idx_tasks_due_at on public.tasks(user_id, due_at) where status = 'pending' and deleted_at is null;

alter table public.tasks enable row level security;

create policy "Users manage own tasks"
  on public.tasks for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  location text,
  event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_events_user_time on public.events(user_id, event_at);

alter table public.events enable row level security;

create policy "Users manage own events"
  on public.events for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- ============================================================
-- EVENT REMINDERS (1 event bisa punya banyak reminder)
-- ============================================================
create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  remind_at timestamptz not null,
  is_default boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_reminders_pending on public.event_reminders(remind_at) where notified_at is null;

alter table public.event_reminders enable row level security;

create policy "Users manage own reminders"
  on public.event_reminders for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- Trigger: auto-create default reminder (H-10 menit) saat event dibuat
create or replace function public.create_default_event_reminder()
returns trigger as $$
begin
  insert into public.event_reminders (event_id, user_id, remind_at, is_default)
  values (new.id, new.user_id, new.event_at - interval '10 minutes', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_default_reminder
  after insert on public.events
  for each row execute function public.create_default_event_reminder();

-- ============================================================
-- POCKETS (dompet virtual)
-- ============================================================
create table public.pockets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  starting_balance numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  created_at timestamptz not null default now()
);

alter table public.pockets enable row level security;

create policy "Users manage own pockets"
  on public.pockets for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- ============================================================
-- CATEGORIES (custom per user, + seed default via trigger)
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name, type)
);

alter table public.categories enable row level security;

create policy "Users manage own categories"
  on public.categories for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  pocket_id uuid not null references public.pockets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions(user_id, transaction_date desc);
create index idx_transactions_pocket on public.transactions(pocket_id);

alter table public.transactions enable row level security;

create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- Derived balance VIEW (bukan kolom fisik agar tidak drift)
create view public.pocket_balances as
select
  p.id as pocket_id,
  p.user_id,
  p.name,
  p.starting_balance
    + coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)
    as current_balance
from public.pockets p
left join public.transactions t on t.pocket_id = p.id
group by p.id;

-- Views inherit RLS dari tabel dasar (pockets, transactions), aman secara default.

-- ============================================================
-- AI CHAT HISTORY (opsional, untuk continuity)
-- ============================================================
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_ai_conv_user on public.ai_conversations(user_id, created_at desc);

alter table public.ai_conversations enable row level security;

create policy "Users manage own AI history"
  on public.ai_conversations for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- ============================================================
-- NOTIFICATION SUBSCRIPTIONS (Web Push)
-- ============================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- ============================================================
-- HANDLE NEW USER: seed default pocket + kategori
-- ============================================================
-- Tabel `neon_auth."user"` dikelola oleh Managed Better Auth. Aplikasi tidak
-- memasang trigger pada schema tersebut. Setelah OTP berhasil diverifikasi,
-- Server Action onboarding membuat profile, pocket, dan kategori default
-- dalam satu transaksi idempotent dengan `on conflict do nothing`.
```

---

## 6. API / Server Actions & Notification Delivery Strategy

### 6.1 Server Actions (Next.js App Router)
Semua mutasi data lewat Server Actions (dijalankan di server, memakai JWT sesi user dari **Managed Better Auth**, lalu memanggil Neon Data API agar RLS tetap aktif), bukan client-side call langsung, untuk operasi yang butuh validasi tambahan:

```
app/actions/
  tasks.ts        -> createTask, updateTask, completeTask, reorderTasks, deleteTask
  events.ts       -> createEvent, addReminder, updateReminder, deleteEvent
  transactions.ts -> createTransaction, deleteTransaction, createPocket
  ai.ts           -> sendAiMessage  (proxy ke Route Handler /api/ai)
  push.ts         -> subscribeToPush, unsubscribeFromPush
```
Read-heavy queries (list task, list event, dashboard summary) memakai `@neondatabase/postgrest-js` ke Neon Data API di Server Component. JWT tetap disuntikkan server-side dan RLS menjamin isolasi.

### 6.2 Notification Delivery Strategy (Web Push)

**Arsitektur:**
1. Client meminta izin notifikasi browser → register Service Worker → subscribe via `PushManager` → simpan `endpoint`, `p256dh`, `auth_key` ke tabel `push_subscriptions` (Server Action `subscribeToPush`).
2. **Vercel Cron Job** (pengganti pg_cron/Supabase Edge Function) memanggil Route Handler `app/api/cron/check-reminders/route.ts` setiap **1 menit** (dikonfigurasi via `vercel.json`, lihat §10.6):
   - Route ini memakai koneksi **owner/service role** ke Neon (bypass RLS — konteks trusted server-only, tidak pernah diexpose ke client) agar bisa scan lintas-user dalam satu query.
   - Query `event_reminders` dengan `remind_at <= now()` dan `notified_at is null`.
   - Query `tasks` dengan `status = 'pending'` dan `due_at` dalam window notifikasi (60 menit & 10 menit) yang belum dikirim (kolom `notified_60m_at`, `notified_10m_at` di tabel `tasks`).
   - Untuk setiap match, ambil `push_subscriptions` milik `user_id` terkait, kirim payload via `web-push` library (VAPID keys) dari dalam Route Handler (Node.js runtime).
   - Tandai `notified_at` / kolom notified agar tidak double-send.
   - Amankan endpoint cron dengan header secret (`CRON_SECRET` env var, dicek di awal handler) agar tidak bisa dipanggil publik.
3. **In-app notification**: selain push, insert row ke tabel `notifications` (in-app feed). Karena Neon tidak punya Realtime bawaan, untuk MVP client melakukan **polling ringan** (React Query `refetchInterval: 15000` pada endpoint notifikasi) — cukup untuk kebutuhan personal dashboard; upgrade ke Pusher/Ably jika nanti butuh push instan sungguhan.
4. Service Worker (`sw.js`) menangani event `push` → menampilkan native notification, dan `notificationclick` → membuka/fokus tab dashboard ke item terkait.

**Kolom tambahan untuk idempotency (tambahan skema):**
```sql
alter table public.tasks
  add column notified_60m_at timestamptz,
  add column notified_10m_at timestamptz;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  title text not null,
  body text,
  type text not null check (type in ('task_due','event_reminder','system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "Users manage own notifications"
  on public.notifications for all
  using (auth.user_id() = user_id) with check (auth.user_id() = user_id);
```

---

## 7. AI Guardrail Strategy & Context Injection Pipeline

### 7.1 Alur Request
```
Client (chat UI)
  → Server Action `sendAiMessage(message)`
    → Ambil session user (server-side, dari signed HTTP-only cookie Managed Better Auth)
    → Panggil Next.js Route Handler `app/api/ai/route.ts` dengan JWT user (Node.js runtime, bukan Edge — karena perlu koneksi Postgres yang lebih fleksibel)
      → Route Handler verifikasi session via `@neondatabase/auth` → dapatkan user_id terpercaya (bukan dari client body!)
      → Buka koneksi Neon dengan role `authenticated` + JWT tsb (RLS otomatis aktif) → fetch context teragregasi (lihat 7.2) khusus user_id ini
      → Susun system prompt + guardrail + context → kirim ke Gemini Flash API
      → (opsional) Gemini melakukan function-calling ke "tools" internal (lihat 7.3)
      → Stream response balik ke client (SSE / `ReadableStream`)
      → Simpan log percakapan ke `ai_conversations`
```

**Prinsip kunci keamanan:** `user_id` **tidak pernah** dipercaya dari payload client — selalu diturunkan dari JWT yang diverifikasi Route Handler. Karena koneksi database untuk fetch context memakai role `authenticated` (bukan owner), RLS Postgres jadi lapisan keamanan kedua: bahkan jika ada bug di kode Route Handler, query tetap tidak bisa menembus data user lain.

### 7.2 Context Injection (ringkas & teragregasi, bukan raw dump)
Data yang di-inject ke prompt (contoh struktur JSON yang disusun via SQL agregasi sebelum masuk ke prompt):
```json
{
  "today": "2026-08-18",
  "pending_tasks": [
    { "title": "Review laporan Q3", "due_at": "2026-08-18T15:00:00+07:00" }
  ],
  "upcoming_events": [
    { "title": "Meeting klien", "event_at": "2026-08-19T10:00:00+07:00" }
  ],
  "finance_summary_30d": {
    "total_income": 8500000,
    "total_expense": 5200000,
    "top_categories": [{ "name": "Makanan", "total": 1800000 }],
    "pockets": [{ "name": "Dompet Utama", "balance": 3300000 }]
  }
}
```
Batasan: maksimal 7 hari ke depan untuk task/event, 30 hari terakhir untuk transaksi (bukan seluruh histori) — menjaga prompt tetap ringkas & murah, serta relevan secara temporal.

### 7.3 Guardrail (System Prompt Level)
Contoh kerangka system prompt (disederhanakan):
- **Identitas & scope**: "Kamu adalah asisten produktivitas personal untuk to-do, agenda, dan keuangan pengguna ini saja."
- **Batasan topik**: Jika pertanyaan di luar 3 domain tsb (coding umum, trivia, topik sensitif, dll), tolak sopan dan arahkan kembali: *"Aku fokus membantu task, agenda, dan keuanganmu di Orbita — ada yang bisa kubantu di area itu?"*
- **Larangan aksi langsung**: AI hanya boleh **mengusulkan** aksi (buat task/reminder/transaksi); eksekusi nyata tetap butuh konfirmasi user via UI (tombol "Ya, buatkan").
- **Larangan halusinasi angka**: AI wajib menggunakan angka dari context yang di-inject / hasil tool-call, tidak boleh mengarang total transaksi.
- **Function calling / tools** yang diekspos ke Gemini (untuk akurasi numerik):
  - `get_task_summary(range)`
  - `get_expense_summary(range, category?)`
  - `get_upcoming_events(range)`
  - `suggest_create_task(title, due_at)` → mengembalikan draft, bukan langsung insert.

### 7.4 Rate Limiting & Biaya
- Kolom `profiles.ai_daily_request_count` + `ai_request_reset_at` di-reset harian via cron; Edge Function menolak request jika limit tercapai (default 30/hari, dapat dikonfigurasi per tier).
- Logging token usage per request untuk monitoring biaya Gemini Flash.

---

## 8. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| Performance | First Contentful Paint < 1.5s (4G), interaksi drag-and-drop < 100ms response, waspadai *cold start* Neon compute setelah scale-to-zero (idle beberapa menit) — mitigasi di §10.7 |
| Security | Semua tabel wajib RLS aktif (Neon RLS Authorize); API key Gemini & connection string role `owner` hanya di server/Route Handler, tidak pernah di client bundle |
| Availability | Target uptime 99.5% (bergantung Vercel + Neon SLA) |
| Accessibility | Kontras warna WCAG AA minimum, semua interactive element dapat diakses keyboard |
| PWA | Installable (manifest.json valid), bekerja offline minimal untuk melihat data ter-cache terakhir (via `next-pwa` + IndexedDB cache) |
| Privasi | Data finansial dienkripsi at-rest & in-transit (default Neon), tidak ada data user dibagikan ke pihak ketiga selain Gemini API (untuk konteks AI, sesuai kebijakan privasi yang diinformasikan ke user) |

---

## 9. Roadmap Ringkas

| Fase | Scope |
|---|---|
| **MVP (v1.0)** | Auth + verifikasi email, To-Do CRUD + drag-reorder + history, Event + default reminder, Ledger dasar (1+ pocket, transaksi, saldo real-time), AI Assistant read-only Q&A dengan guardrail, Web Push dasar, PWA installable |
| **v1.1** | Recurring events, subtasks, budget cap kategori, AI dapat submit draft task/transaksi (dengan konfirmasi), export CSV |
| **v1.2** | Magic link login, onboarding checklist, offline-first improvements, multi-currency ringan |

---

## 10. Panduan Setup: Migrasi ke Neon

Panduan ini untuk menyiapkan project dari nol (atau migrasi dari Supabase) menggunakan Neon + Neon Auth.

### 10.1 Buat Project Neon
1. Daftar/masuk ke [console.neon.tech](https://console.neon.tech) (bisa pakai akun GitHub, tanpa kartu kredit).
2. Klik **New Project** → pilih region terdekat (mis. Singapore/AWS ap-southeast-1 untuk latensi terbaik dari Indonesia).
3. Neon otomatis membuat database `neondb` dan role owner (`neondb_owner`) — catat **connection string owner** dari tab **Connection Details**, ada dua varian:
   - **Pooled connection** (`-pooler` di hostname) → dipakai di aplikasi (serverless-friendly).
   - **Direct connection** → dipakai untuk migrasi/DDL (`psql`, Drizzle/Prisma migrate).

### 10.2 Aktifkan Neon Auth
1. Di dashboard project → menu **Auth** → klik **Enable Neon Auth**.
2. Neon otomatis membuat Managed Better Auth dan schema `neon_auth`, termasuk tabel `neon_auth."user"`.
3. Di tab **Auth → Configuration**, aktifkan Email/Password, wajibkan verifikasi email, dan pilih metode OTP. Shared email provider Neon mendukung OTP, bukan verification link.
4. Install SDK di project Next.js:
   ```bash
   npm install @neondatabase/auth
   ```
5. Buat instance server melalui `createNeonAuth` di `lib/auth/server.ts`, route proxy `app/api/auth/[...path]/route.ts`, dan middleware untuk melindungi route dashboard. Form signup, login, dan verifikasi OTP memakai API SDK agar dapat mengikuti `DESIGN.md`.

### 10.3 Hubungkan Neon RLS Authorize
1. Di dashboard project → menu **RLS Authorize** (atau **Authorize**) → klik **Connect a provider** → pilih **Neon Auth** (karena sudah terhubung di langkah 10.2, ini otomatis terdeteksi, tinggal konfirmasi).
2. Neon otomatis: mengaktifkan extension `pg_session_jwt`, membuat role `authenticated` dan `anonymous`, serta mengatur JWKS agar token dari Neon Auth otomatis tervalidasi di Postgres.
3. Catat **connection string role `authenticated`** (beda dari owner) — inilah yang dipakai aplikasi untuk semua request atas nama user (lihat §2.1 poin 4).

### 10.4 Jalankan Migrasi Schema
1. Simpan seluruh DDL di §5 ke file `db/schema.sql`.
2. Jalankan via `psql` memakai **direct connection** (role owner):
   ```bash
   psql "postgresql://neondb_owner:<password>@<direct-host>/neondb?sslmode=require" -f db/schema.sql
   ```
   Atau jika pakai ORM (disarankan untuk maintainability jangka panjang): setup **Drizzle ORM** dengan `drizzle-kit push`/`migrate`, arahkan `DATABASE_URL` ke direct connection.
3. Berikan hak akses tabel ke role `authenticated` (Neon RLS Authorize biasanya sudah menghandle grant dasar, tapi verifikasi):
   ```sql
   grant select, insert, update, delete on all tables in schema public to authenticated;
   grant usage on all sequences in schema public to authenticated;
   ```

### 10.5 Environment Variables (`.env.local`)
```bash
# Neon
DATABASE_URL="postgresql://neondb_owner:<password>@<pooled-host>/neondb?sslmode=require"          # role owner, server-only (cron, seed)
NEON_DATA_API_URL="https://<data-api-host>/<database>/rest/v1"                                    # request user dengan JWT dan RLS

# Neon Auth (Managed Better Auth)
NEON_AUTH_BASE_URL="https://<auth-host>/neondb/auth"
NEON_AUTH_COOKIE_SECRET="<random-secret-minimum-32-characters>"

# Gemini
GEMINI_API_KEY="..."

# Web Push (generate via `npx web-push generate-vapid-keys`)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@orbita.app"

# Cron
CRON_SECRET="..."   # header rahasia untuk memverifikasi request dari Vercel Cron
```
Set variabel yang sama di **Vercel → Project Settings → Environment Variables** untuk production/preview.

### 10.6 Setup Vercel Cron (pengganti pg_cron)
Buat/edit `vercel.json` di root project:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-reminders",
      "schedule": "* * * * *"
    }
  ]
}
```
Di `app/api/cron/check-reminders/route.ts`, validasi request datang dari Vercel Cron (bukan publik):
```ts
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ...query reminders & tasks pakai koneksi owner (DATABASE_URL), kirim web-push
}
```
> Catatan: paket free Vercel Cron membatasi frekuensi minimum (cek dashboard Vercel terbaru untuk limit berjalan saat ini — jika `* * * * *` tidak tersedia di free tier, gunakan interval terpendek yang diizinkan, mis. tiap 5 menit, dan sesuaikan ekspektasi presisi notifikasi di UI).

### 10.7 Cold Start Mitigation (Scale-to-Zero)
Neon men-suspend compute saat idle untuk hemat biaya — request pertama setelah idle bisa terasa lambat (beberapa ratus ms - detik).
- Untuk cron reminder: tidak masalah (background job, user tidak menunggu).
- Untuk request user (login, buka dashboard): tampilkan skeleton loading yang baik (sudah dirancang di DESIGN.md) agar cold start tidak terasa seperti aplikasi hang.
- Opsional: gunakan Neon **Autoscaling** dengan compute minimum > 0 jika budget memungkinkan di masa depan (mengorbankan sebagian gratis-nya scale-to-zero demi latensi konsisten).

### 10.8 Migrasi Data dari Supabase (jika ada data existing)
1. Export data lama: `pg_dump --data-only --no-owner <supabase-connection-string> > data.sql`.
2. Sesuaikan referensi `auth.users` di `data.sql`. User perlu didaftarkan ulang melalui Managed Better Auth karena tabel `neon_auth."user"` dikelola platform dan tidak dipulihkan langsung dari dump lama. Migrasi user riil memerlukan mapping ID.
3. Import data non-auth (tasks, events, transactions, dst) ke Neon: `psql <neon-direct-connection> < data.sql`, sesuaikan `user_id` ke ID baru dari Neon Auth.
4. Verifikasi RLS bekerja dengan login sebagai user test dan memastikan hanya data miliknya yang muncul.
