import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <section className="offline-card" aria-labelledby="offline-title">
        <span className="offline-icon" aria-hidden="true"><WifiOff /></span>
        <p className="section-kicker">Mode offline</p>
        <h1 id="offline-title">Orbita belum dapat terhubung</h1>
        <p>Periksa koneksi internetmu. Data akun dan perubahan baru hanya dimuat saat koneksi tersedia.</p>
        <Link className="primary-button" href="/today">Coba hubungkan lagi</Link>
      </section>
    </main>
  );
}
