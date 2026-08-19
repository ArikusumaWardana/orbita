import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthFrame
      eyebrow="Password baru"
      title="Amankan kembali akunmu"
      description="Buat password baru dengan minimal satu huruf dan satu angka."
      footer={<p>Petunjuk kedaluwarsa? <Link href="/auth/forgot-password">Kirim ulang</Link></p>}
    >
      <ResetPasswordForm token={token} />
    </AuthFrame>
  );
}

