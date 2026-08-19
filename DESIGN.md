# DESIGN.md — Orbita Design System

Referensi visual utama: dashboard analitik bergaya dark-mode minimalis (kartu metrik dengan angka besar + delta %, sidebar ikon tipis, panel AI Assistant sebagai chat overlay, date picker rounded dengan aksen hitam solid untuk tanggal terpilih). Orbita mengadaptasi bahasa visual ini untuk konteks productivity/finance personal.

---

## 1. Design Philosophy

1. **Calm, bukan ramai.** Data ditampilkan sebagai kartu bersih dengan whitespace luas — bukan dashboard analitik padat. Fokus pada satu metrik/aksi per kartu.
2. **Dark-mode-first.** Mode gelap adalah pengalaman utama (mengikuti referensi), light mode sebagai alternatif dengan token warna yang sama-sama terdefinisi.
3. **Data punya hierarki, bukan hanya tabel.** Angka besar (metrik utama) selalu lebih dominan secara tipografi daripada label/keterangan di sekitarnya.
4. **Motion sebagai umpan balik, bukan dekorasi.** Setiap animasi menjawab pertanyaan "apa yang baru saja terjadi?" (item ditambahkan, dipindah, dihapus, status berubah).

---

## 2. Color Palette

### 2.1 Dark Mode (default)

| Token | Hex | Penggunaan |
|---|---|---|
| `--bg-base` | `#0E0F11` | Background utama aplikasi |
| `--bg-surface` | `#17181B` | Card/panel default |
| `--bg-surface-raised` | `#1F2023` | Card di atas card (modal, chat panel) |
| `--bg-sidebar` | `#111214` | Sidebar navigasi |
| `--border-subtle` | `#2A2B2F` | Border kartu, divider |
| `--text-primary` | `#F5F5F6` | Judul, angka metrik utama |
| `--text-secondary` | `#9A9CA3` | Label, keterangan |
| `--text-tertiary` | `#5E6066` | Placeholder, disabled |
| `--accent-primary` | `#6C5CE7` | Aksen brand (tombol utama, active state) — ungu-indigo modern |
| `--accent-positive` | `#3DD68C` | Delta positif, income, status "completed" |
| `--accent-negative` | `#F26D6D` | Delta negatif, expense, overdue |
| `--accent-warning` | `#F5B84E` | Task mendekati deadline |
| `--chart-line` | `#3DD68C` | Sparkline default |

### 2.2 Light Mode (alternatif)

| Token | Hex |
|---|---|
| `--bg-base` | `#F7F7F8` |
| `--bg-surface` | `#FFFFFF` |
| `--border-subtle` | `#E7E7EA` |
| `--text-primary` | `#16171A` |
| `--text-secondary` | `#6B6D75` |
| Aksen (positive/negative/warning/primary) | sama seperti dark mode, kontras disesuaikan agar tetap AA compliant |

> Implementasi: gunakan CSS variables di `:root` dan `[data-theme="light"]`, dikontrol via Tailwind `dark:` variant + `next-themes`.

---

## 3. Typography

- **Font family:** `Inter` (UI umum) — clean, mendukung tabular numerals untuk angka finansial. Fallback: `system-ui, sans-serif`.
- **Angka finansial/metrik selalu pakai `font-variant-numeric: tabular-nums`** agar kolom angka rapi sejajar (penting untuk tabel ledger).

| Style | Size / Weight | Penggunaan |
|---|---|---|
| Display / Metric Number | 32px, Semibold (600) | Angka besar di kartu metrik (mis. saldo, total task) |
| H1 | 24px, Semibold | Judul halaman ("Markets" → "Overview", "Tasks", "Finance") |
| H2 | 18px, Medium | Judul section/kartu |
| Body | 14px, Regular | Teks umum, deskripsi task |
| Label / Caption | 12px, Medium, letter-spacing 0.02em | Label field, keterangan delta ("Compared to previous 7 days") |
| Micro | 11px, Regular | Timestamp, meta info sekunder |

---

## 4. Component Hierarchy

```
AppShell
├── Sidebar (persistent, collapsible di mobile → bottom nav / drawer)
│   ├── Logo/Brand
│   ├── NavItem (Home, Tasks, Events, Finance, AI Assistant, Settings)
│   └── UserMenu (avatar, sign out)
├── TopBar
│   ├── PageTitle + Breadcrumb
│   ├── DateRangeFilter (dropdown, style: "Last 7 days")
│   └── QuickActionButton ("+ New Task/Event/Transaction")
├── MainContent
│   ├── MetricCard (angka besar + label + delta chip + optional sparkline)
│   ├── TaskListPanel
│   │   ├── TaskItem (draggable, checkbox, due badge)
│   │   └── TaskHistoryGroup (grouped by date, collapsible)
│   ├── EventCalendarPanel
│   │   ├── MonthGrid (dot indicator per tanggal)
│   │   └── EventListForSelectedDate
│   ├── FinancePanel
│   │   ├── PocketSelector (tabs/chips per pocket)
│   │   ├── BalanceMetricCard
│   │   ├── TransactionListGroup (grouped by date)
│   │   └── TrendChart (line/bar mingguan)
│   └── DataTable (generic: top categories, top tasks, dsb.)
└── AIAssistantPanel (slide-in overlay dari kanan, style: dark chat bubble)
    ├── ChatHeader (title + close + "New chat")
    ├── SuggestionChips ("Ringkas hari ini", "Cek pengeluaran minggu ini")
    ├── MessageList (user bubble kanan-terang, assistant bubble kiri-gelap dgn ikon)
    ├── ActionConfirmCard (saat AI usulkan buat task/transaksi → butuh konfirmasi)
    └── ChatInputBar (textarea + send button + "Thinking..." indicator)
```

### 4.1 Kartu Metrik (MetricCard) — spesifikasi detail
Mengikuti pola dari referensi (angka besar, label kecil di atas, delta chip berwarna di kanan angka, keterangan pembanding di bawah):
```
┌───────────────────────────────┐
│ Total Sales                   │  <- Label (12px, secondary)
│ €4,782            [+7%]       │  <- Number (32px) + delta chip
│ Up 7% this week                │  <- Caption (11px, tertiary)
└───────────────────────────────┘
```
- Delta chip: pill kecil, background `accent-positive/15%` teks `accent-positive` untuk naik; sebaliknya untuk turun. Icon panah kecil (Lucide `ArrowUp`/`ArrowDown`) di dalam chip.
- Radius kartu: `16px`. Padding: `20px`. Border: `1px solid var(--border-subtle)`.

### 4.2 Date Picker (mengacu referensi gambar 2)
- Grid kalender dengan header bulan + navigasi `<` `>`.
- Tanggal terpilih: background solid `--text-primary` (kontras tinggi, bulat penuh/`rounded-full`), teks berbalik warna.
- Tanggal "hari ini" (belum dipilih): border tipis saja, tanpa fill.
- Footer: tombol `Cancel` (ghost) dan `Apply` (solid, primary/dark) — mengikuti pola tombol pill referensi.

---

## 5. Layout Wireframe Specs

### 5.1 Desktop (≥1280px) — 3-column adaptif
```
┌──────┬──────────────────────────────────────────┬───────────────┐
│      │  TopBar (title, filter, quick action)     │               │
│ Side │──────────────────────────────────────────│  AI Assistant │
│ bar  │  Metric Cards Row (3–4 kartu, grid)        │  Panel        │
│ 72–  │──────────────────────────────────────────│  (togglable,  │
│ 240px│  Main Panel (Task List / Calendar / Ledger)│  slide-in     │
│      │                                            │  dari kanan,  │
│      │  Secondary Panel (chart / history)         │  380px)       │
└──────┴──────────────────────────────────────────┴───────────────┘
```
- Sidebar default **icon-only (72px)**, expand ke 240px on hover/pin (sesuai referensi kiri gambar 1 & 3).
- AI Assistant panel **tidak selalu terbuka** — default hidden, muncul sebagai overlay/slide panel saat diklik dari sidebar, mengambang di atas konten (tidak mendorong layout, memakai `position: fixed` + backdrop blur tipis).

### 5.2 Tablet (768–1279px) — 2-column
- Sidebar collapse otomatis ke icon-only.
- AI Assistant panel menjadi **full-overlay modal** (bukan side panel) agar tidak memotong ruang konten.
- Grid metrik kartu: 2 kolom.

### 5.3 Mobile (<768px) — Mobile-first, single column
```
┌────────────────────────────┐
│ TopBar (title + avatar)    │
├────────────────────────────┤
│ Metric Card (carousel/     │
│ horizontal scroll snap)    │
├────────────────────────────┤
│ Main Content (stacked)     │
│                             │
├────────────────────────────┤
│ Bottom Nav (5 ikon utama:  │
│ Home, Tasks, Events, $$,   │
│ AI)                        │
└────────────────────────────┘
```
- Sidebar **digantikan bottom navigation bar** (fixed, 5 ikon, style flat mengikuti Lucide icon set).
- AI Assistant dibuka sebagai **full-screen sheet** dari bawah (bottom sheet, swipe-to-dismiss) — pola native mobile chat.
- Kartu metrik di-scroll horizontal (snap-scroll) alih-alih grid, agar 1 kartu = 1 fokus (mirip gambar 2 referensi).
- Form (task/event/transaksi baru) dibuka sebagai **bottom sheet modal**, bukan halaman terpisah, untuk mempertahankan konteks.
- Target ukuran tap minimum: 44×44px (iOS/Android guideline).
- Date picker mobile: full-width bottom sheet, bukan dropdown kecil.

---

## 6. Framer Motion — Spesifikasi Animasi

| Interaksi | Animasi | Parameter |
|---|---|---|
| Page/route transition | Fade + slight slide-up (8px) | `duration: 0.2s`, `ease: [0.4, 0, 0.2, 1]` |
| MetricCard mount (staggered) | Fade + scale dari 0.97 → 1 | `stagger: 0.05s` antar kartu |
| Task drag-and-drop | `layout` animation (Framer `layout` prop) pada `TaskItem`, ghost placeholder saat drag | `transition: { type: "spring", stiffness: 500, damping: 40 }` |
| Task complete (checkbox tick) | Checkbox scale-bounce + strikethrough text animasi + fade-out sebelum pindah ke History | `0.15s` checkbox, `0.3s` delay sebelum fade-out |
| AI Assistant panel open/close | Slide-in dari kanan (desktop) `x: 400 → 0`; bottom sheet (mobile) `y: 100% → 0` | `type: "spring", stiffness: 300, damping: 30` |
| Chat bubble muncul | Fade + slide-up 6px, muncul per-bubble saat streaming | `duration: 0.15s` per chunk |
| "Thinking..." indicator | 3-dot bounce loop | `repeat: Infinity`, `staggerChildren: 0.15` |
| Toast/undo notification | Slide-in dari bawah/atas + auto-exit progress bar | `duration: 0.25s` masuk, linear progress 5s untuk auto-dismiss |
| Delta chip (naik/turun) saat data refresh | Number count-up animation (bukan library Framer, tapi `useMotionValue` + `animate()`) | `duration: 0.6s`, `ease: "easeOut"` |
| Modal/bottom sheet | Backdrop fade + panel spring-in | Backdrop `duration: 0.2s`; panel `spring` seperti di atas |

**Prinsip umum:** semua durasi transisi UI utama berada di rentang **150–300ms**; animasi lebih panjang (count-up, progress bar) boleh sampai 600ms tapi tidak boleh memblokir interaksi berikutnya (non-blocking, `pointer-events` tetap aktif).

---

## 6.1 Search & Async Action Patterns

Pola wajib untuk semua input search dan tombol pemicu aksi async (submit form, generate AI response, dsb.) di seluruh aplikasi — berlaku di Task search, Event search, Transaction search/filter, dan chat AI Assistant.

### 6.1.1 Debounce pada Search

**Aturan:**
- Semua search/filter input **wajib** di-debounce, **tidak boleh** fetch on every keystroke.
- Delay default: **350ms** (cukup responsif tapi menghindari request berlebihan saat mengetik cepat).
- Minimum karakter sebelum trigger: **2 karakter** (kecuali user mengosongkan input → langsung reset ke state semula tanpa delay).
- Request sebelumnya yang belum selesai **wajib di-cancel** (via `AbortController`) saat query baru masuk, mencegah *race condition* (hasil lama menimpa hasil baru).
- Tampilkan **inline spinner kecil** (16px, `Loader2` dari Lucide, `animate-spin`) di sisi kanan input search selama request berlangsung — bukan full-page loading, agar user tetap bisa lanjut mengetik.

**Contoh implementasi (hook):**
```tsx
// hooks/use-debounced-search.ts
import { useState, useEffect, useRef } from "react";

export function useDebouncedSearch(query: string, delay = 350) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length > 0 && query.length < 2) return; // min char threshold
    setIsSearching(true);

    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, delay);

    return () => clearTimeout(timer); // reset timer tiap keystroke baru
  }, [query, delay]);

  return { debouncedQuery, isSearching };
}
```

**Contoh input dengan indikator:**
```tsx
<div className="relative">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--text-tertiary]" />
  <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Cari task, event, atau transaksi..."
    className="pl-9 pr-9 h-10 rounded-[10px] bg-[--bg-surface] border border-[--border-subtle]"
  />
  {isSearching && (
    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[--text-tertiary]" />
  )}
</div>
```

**Motion:** spinner muncul dengan fade-in `0.1s`, tidak ada layout shift (posisi `absolute`, tidak mendorong teks/lebar input).

### 6.1.2 Loading State pada Button (Trigger Action)

Berlaku untuk semua tombol yang memicu proses async: *Save Task*, *Create Event*, *Submit Transaction*, *Send (AI chat)*, *Sign In/Register*, dll.

**Aturan wajib:**
1. Saat proses berjalan → tombol **disabled** (mencegah double-submit) dan menampilkan **`Loader2` icon berputar** (`animate-spin`) menggantikan ikon asli atau di sebelah kiri label.
2. **Lebar tombol dikunci** (`min-width` sesuai lebar state normal) agar tidak terjadi layout shift saat teks berganti jadi spinner.
3. Label teks boleh tetap tampil (mis. "Menyimpan...") atau icon-only tergantung ukuran tombol — tapi ikon spinner **wajib selalu ada** sebagai indikator visual utama.
4. Setelah selesai: transisi singkat ke state sukses (opsional checkmark `0.3s` lalu kembali normal) atau langsung kembali ke state normal jika navigasi/close terjadi.
5. Jika gagal: tombol kembali ke state normal + micro-shake animation (`x: [-4,4,-4,4,0]`, `0.3s`) sebagai indikasi error, disertai toast/error message.

**Contoh implementasi (component):**
```tsx
// components/ui/loading-button.tsx
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  isLoading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={isLoading || disabled}
      className={`min-w-[140px] justify-center gap-2 ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? (loadingText ?? "Memproses...") : children}
    </Button>
  );
}
```

**Contoh pemakaian pada Server Action (form submit):**
```tsx
const [isPending, startTransition] = useTransition();

function handleSubmit(formData: FormData) {
  startTransition(async () => {
    await createTask(formData); // Server Action
  });
}

<LoadingButton isLoading={isPending} loadingText="Menyimpan..." onClick={...}>
  Simpan Task
</LoadingButton>
```

**Cakupan penerapan di aplikasi:**

| Tombol/Aksi | Loading Indicator |
|---|---|
| Search (Task/Event/Transaction) | Inline `Loader2` di dalam input, debounce 350ms |
| Save/Create (Task, Event, Transaction, Pocket) | `LoadingButton` dengan label "Menyimpan..." |
| Send AI Chat message | Tombol send berubah jadi `Loader2` spin, ditambah bubble "Thinking..." (lihat §6 tabel animasi) |
| Sign In / Register | `LoadingButton` full-width, label "Masuk..." / "Mendaftar..." |
| Resend verification email | `LoadingButton` + cooldown timer (mis. "Kirim ulang (30s)") setelah loading selesai |
| Delete (task/event/transaksi) | Icon trash berganti `Loader2` sementara, disabled saat proses |

---

## 7. Iconography

- **Icon set:** Lucide React, stroke width `1.5–1.75px` konsisten di seluruh app (sesuai gaya sidebar tipis pada referensi).
- Ikon navigasi utama: `Home`, `CheckSquare` (Tasks), `Calendar` (Events), `Wallet` (Finance), `Sparkles` atau `Bot` (AI Assistant), `Settings`.
- Ikon status: `CheckCircle2` (completed, warna positive), `Clock` (pending/upcoming), `AlertTriangle` (overdue/near-deadline, warna warning/negative).
- Ukuran standar: 18px di sidebar/list item, 16px di dalam chip/badge, 20–24px di empty state ilustratif.

---

## 8. Elevation & Radius System

| Level | Radius | Shadow (dark mode) |
|---|---|---|
| Card | 16px | `0 1px 2px rgba(0,0,0,0.4)` |
| Modal/Sheet | 20px (top corners saja untuk bottom sheet) | `0 8px 24px rgba(0,0,0,0.5)` |
| Button (pill) | 999px (full) untuk tombol utama & chip; 10px untuk tombol sekunder persegi | — |
| Input field | 10px | Border `1px solid var(--border-subtle)`, focus ring `2px accent-primary/40%` |
| Avatar | full circle | — |

---

## 9. Responsive & Mobile-First Guidelines (Ringkasan Implementasi)

1. **Bangun dari mobile ke atas** — breakpoint Tailwind: `base (mobile) → sm:640 → md:768 → lg:1024 → xl:1280`. Semua komponen didesain default untuk layar sempit dulu, lalu di-enhance dengan `md:`/`lg:` prefix.
2. **Navigasi adaptif**: Sidebar (desktop/tablet) ⇄ Bottom Nav (mobile) — bukan sidebar yang di-hide, tapi komponen berbeda yang di-render kondisional (`useMediaQuery` / CSS `hidden md:flex`).
3. **Form = bottom sheet di mobile, modal center di desktop** — satu komponen `<ResponsiveDialog>` yang switch presentation berdasarkan viewport (pola shadcn/ui + Vaul untuk drawer).
4. **Chart tetap terbaca di layar kecil**: sembunyikan gridline sekunder, kurangi jumlah tick label, sparkline tetap full-width tapi height diperkecil (dari 80px desktop → 48px mobile).
5. **PWA checklist**: `manifest.json` dengan `display: standalone`, `theme_color` = `--bg-base`, ikon 192px & 512px, splash screen mengikuti warna dark mode; Service Worker cache-first untuk asset statis, network-first untuk data API.
6. **Safe-area handling** untuk notch/home-indicator di mobile (`env(safe-area-inset-bottom)` pada bottom nav & bottom sheet).
