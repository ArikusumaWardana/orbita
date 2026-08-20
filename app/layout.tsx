import type { Metadata } from "next";
import { PwaLifecycle } from "@/components/pwa-lifecycle";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbita",
  description: "Task, agenda, dan catatan keuangan pribadi dalam satu ruang kerja.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orbita",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body><ToastProvider>{children}<PwaLifecycle /></ToastProvider></body>
    </html>
  );
}
