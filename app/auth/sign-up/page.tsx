import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthFrame
      eyebrow="Akun baru"
      title="Buat ruang kerjamu"
      description="Daftar dengan email, lalu verifikasi menggunakan kode yang kami kirim."
      footer={<p>Sudah punya akun? <Link href="/auth/sign-in">Masuk</Link></p>}
    >
      <SignUpForm />
    </AuthFrame>
  );
}

