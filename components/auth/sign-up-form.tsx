"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));

    if (!PASSWORD_PATTERN.test(password)) {
      setError("Password perlu minimal 8 karakter, dengan huruf dan angka.");
      setPending(false);
      return;
    }

    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(getAuthErrorMessage(result.error, "Akun belum dapat dibuat. Periksa data lalu coba lagi."));
        return;
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (caught) {
      setError(getAuthErrorMessage(caught, "Akun belum dapat dibuat. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="name">Nama
        <input id="name" name="name" type="text" autoComplete="name" required maxLength={100} placeholder="Nama yang ingin ditampilkan" />
      </label>
      <label htmlFor="email">Email
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
      </label>
      <label htmlFor="password">Password
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Minimal 8 karakter" aria-describedby="password-help" />
      </label>
      <p id="password-help" className="field-help">Gunakan setidaknya satu huruf dan satu angka.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={pending}>
        {pending && <Loader2 className="spin" aria-hidden="true" />}
        {pending ? "Membuat akun..." : "Buat akun Orbita"}
      </button>
    </form>
  );
}
