"use client";

import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (result.error) {
        setError(getAuthErrorMessage(result.error, "Permintaan reset belum dapat dikirim."));
        return;
      }
      setNotice("Jika email terdaftar, petunjuk reset akan dikirim.");
    } catch (caught) {
      setError(getAuthErrorMessage(caught, "Permintaan reset belum dapat dikirim. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="reset-email">Email
        <input id="reset-email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={pending}>
        {pending && <Loader2 className="spin" aria-hidden="true" />}
        {pending ? "Mengirim..." : "Kirim petunjuk reset"}
      </button>
    </form>
  );
}
