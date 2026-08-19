import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbita",
  description: "Task, agenda, dan catatan keuangan pribadi dalam satu ruang kerja.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
