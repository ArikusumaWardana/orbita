"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { showToast } from "@/components/ui/toast-provider";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        const message = getAuthErrorMessage(result.error, "Email atau password tidak cocok.");
        setError(message);
        showToast("error", message);
        return;
      }

      showToast("success", "Login berhasil. Selamat datang kembali.");
      router.push("/");
      router.refresh();
    } catch (caught) {
      const message = getAuthErrorMessage(caught, "Login belum dapat diproses. Coba lagi.");
      setError(message);
      showToast("error", message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="email">Email
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
      </label>
      <label htmlFor="password">Password
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Masukkan password" />
      </label>
      <div className="auth-form-row">
        <span />
        <Link href="/auth/forgot-password">Lupa password?</Link>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={pending}>
        {pending && <Loader2 className="spin" aria-hidden="true" />}
        {pending ? "Memeriksa..." : "Masuk ke Orbita"}
      </button>
    </form>
  );
}
