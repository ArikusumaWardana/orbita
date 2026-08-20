"use client";

import { useEffect } from "react";
import { showToast } from "@/components/ui/toast-provider";

const UPDATE_INTERVAL = 60 * 60 * 1_000;

export function PwaLifecycle() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let interval: number | undefined;
    let disposed = false;

    const showOffline = () => showToast("error", "Koneksi terputus. Perubahan baru belum dapat disimpan.");
    const showOnline = () => showToast("success", "Koneksi kembali tersedia.");

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (disposed) return;

        const notifyUpdate = () => {
          if (navigator.serviceWorker.controller) {
            showToast("success", "Versi baru Orbita siap. Muat ulang saat pekerjaanmu selesai.");
          }
        };

        if (registration.waiting) notifyUpdate();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") notifyUpdate();
          });
        });

        interval = window.setInterval(() => registration.update().catch(() => undefined), UPDATE_INTERVAL);
      } catch {
        // PWA registration is progressive enhancement. The web app remains usable without it.
      }
    }

    register();
    window.addEventListener("offline", showOffline);
    window.addEventListener("online", showOnline);

    return () => {
      disposed = true;
      if (interval) window.clearInterval(interval);
      window.removeEventListener("offline", showOffline);
      window.removeEventListener("online", showOnline);
    };
  }, []);

  return null;
}
