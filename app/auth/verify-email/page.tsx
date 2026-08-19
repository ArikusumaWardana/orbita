import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { OtpForm } from "@/components/auth/otp-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthFrame
      eyebrow="Verifikasi email"
      title="Periksa kotak masukmu"
      description="Masukkan kode OTP yang dikirim oleh Neon Auth. Kode hanya dapat digunakan satu kali."
      footer={<p>Salah email? <Link href="/auth/sign-up">Kembali ke pendaftaran</Link></p>}
    >
      <OtpForm initialEmail={email} />
    </AuthFrame>
  );
}

