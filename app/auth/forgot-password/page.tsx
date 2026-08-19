import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      eyebrow="Pemulihan akun"
      title="Atur ulang password"
      description="Masukkan email akunmu untuk menerima petunjuk reset."
      footer={<p>Ingat passwordmu? <Link href="/auth/sign-in">Kembali masuk</Link></p>}
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
