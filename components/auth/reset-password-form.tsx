"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const confirmation = String(data.get("confirmation"));

    if (!token) {
      setError("Tautan reset tidak lengkap. Minta petunjuk reset yang baru.");
      setPending(false);
      return;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      setError("Password perlu minimal 8 karakter, dengan huruf dan angka.");
      setPending(false);
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi password belum sama.");
      setPending(false);
      return;
    }

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(getAuthErrorMessage(result.error, "Password belum dapat diperbarui."));
        return;
      }
      router.push("/auth/sign-in?reset=1");
    } catch (caught) {
      setError(getAuthErrorMessage(caught, "Password belum dapat diperbarui. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="new-password">Password baru
        <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Minimal 8 karakter" />
      </label>
      <label htmlFor="confirm-password">Ulangi password
        <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} placeholder="Ketik password sekali lagi" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={pending}>
        {pending && <Loader2 className="spin" aria-hidden="true" />}
        {pending ? "Menyimpan..." : "Simpan password baru"}
      </button>
    </form>
  );
}
