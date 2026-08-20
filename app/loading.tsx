import { Bot, CalendarDays, CheckSquare2, Home, WalletCards } from "lucide-react";
import Link from "next/link";

export default function Loading() {
  return (
    <div className="app-shell">
      <aside className="sidebar route-loader-sidebar" aria-label="Navigasi utama">
        <Link className="wordmark wordmark-link" href="/today" aria-label="Orbita">
          <span className="orbit-mark" aria-hidden="true"><span /></span>
          <span>Orbita</span>
        </Link>
        <nav className="side-nav">
          <Link className="nav-item" href="/today"><Home aria-hidden="true" /><span>Hari ini</span></Link>
          <Link className="nav-item" href="/"><CheckSquare2 aria-hidden="true" /><span>Task</span></Link>
          <Link className="nav-item" href="/events"><CalendarDays aria-hidden="true" /><span>Agenda</span></Link>
          <Link className="nav-item" href="/finance"><WalletCards aria-hidden="true" /><span>Keuangan</span></Link>
          <Link className="nav-item" href="/assistant"><Bot aria-hidden="true" /><span>Asisten</span></Link>
        </nav>
      </aside>
      <div className="route-loader" role="status" aria-live="polite" aria-label="Memuat halaman">
        <span className="route-loader-orbit" aria-hidden="true">
          <i />
        </span>
        <span>Menyiapkan halaman...</span>
      </div>
    </div>
  );
}
