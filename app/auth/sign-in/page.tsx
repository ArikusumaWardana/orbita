import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ verified?: string; reset?: string }> }) {
  const { verified, reset } = await searchParams;
  const description = verified === "1"
    ? "Email sudah terverifikasi. Kamu sekarang dapat masuk."
    : reset === "1"
      ? "Password sudah diperbarui. Masuk menggunakan password baru."
      : "Lanjutkan dari task terakhir yang kamu tinggalkan.";
  return (
    <AuthFrame
      eyebrow="Selamat datang kembali"
      title="Masuk ke akunmu"
      description={description}
      footer={<p>Belum punya akun? <Link href="/auth/sign-up">Buat akun</Link></p>}
    >
      <SignInForm />
    </AuthFrame>
  );
}
