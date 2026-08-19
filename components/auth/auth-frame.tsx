import Link from "next/link";
import type { ReactNode } from "react";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-label="Tentang Orbita">
        <Link className="wordmark auth-wordmark" href="/auth/sign-in" aria-label="Orbita, kembali ke halaman masuk">
          <span className="orbit-mark" aria-hidden="true"><span /></span>
          <span>Orbita</span>
        </Link>
        <div className="auth-intro-copy">
          <p className="eyebrow">Satu ruang untuk harimu</p>
          <h2>Waktu dan uangmu, tetap dalam lintasan.</h2>
          <p>Susun task, agenda, dan catatan kas pribadi tanpa berpindah aplikasi.</p>
        </div>
        <p className="auth-note">Dashboard pribadi. Setiap akun hanya melihat datanya sendiri.</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <p className="section-kicker">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}

