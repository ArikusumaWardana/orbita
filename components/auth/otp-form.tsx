"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { showToast } from "@/components/ui/toast-provider";

export function OtpForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const otp = String(data.get("otp")).replace(/\s/g, "");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = await authClient.emailOtp.verifyEmail({ email: normalizedEmail, otp });
      if (result.error) {
        const message = getAuthErrorMessage(result.error, "Kode tidak valid atau sudah kedaluwarsa.");
        setError(message);
        showToast("error", message);
        return;
      }

      showToast("success", "Email berhasil diverifikasi. Silakan masuk ke akunmu.");
      router.push("/auth/sign-in?verified=1");
    } catch (caught) {
      const message = getAuthErrorMessage(caught, "Kode belum dapat diverifikasi. Coba lagi.");
      setError(message);
      showToast("error", message);
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || !email) return;
    setError("");
    setNotice("");
    setPending(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });
      if (result.error) {
        setError(getAuthErrorMessage(result.error, "Kode baru belum dapat dikirim."));
        return;
      }
      setNotice("Kode baru sudah dikirim.");
      setCooldown(30);
    } catch (caught) {
      setError(getAuthErrorMessage(caught, "Kode baru belum dapat dikirim. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="verify-email">Email
        <input id="verify-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
      </label>
      <label htmlFor="otp">Kode OTP
        <input id="otp" name="otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={8} placeholder="Masukkan kode dari email" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={pending}>
        {pending && <Loader2 className="spin" aria-hidden="true" />}
        {pending ? "Memverifikasi..." : "Verifikasi email"}
      </button>
      <button className="secondary-button auth-submit" type="button" onClick={resend} disabled={cooldown > 0 || pending}>
        {pending ? "Mengirim..." : cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang kode"}
      </button>
    </form>
  );
}
