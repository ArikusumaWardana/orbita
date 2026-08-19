"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ToastTone = "success" | "error";

type ToastMessage = {
  id: string;
  message: string;
  tone: ToastTone;
};

const TOAST_EVENT = "orbita:toast";
const TOAST_STORAGE_KEY = "orbita.flash-toast";

export function showToast(tone: ToastTone, message: string) {
  const detail: ToastMessage = { id: crypto.randomUUID(), message, tone };
  window.sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(detail));
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail }));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
    window.sessionStorage.removeItem(TOAST_STORAGE_KEY);
  }, []);

  const present = useCallback((nextToast: ToastMessage) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast(nextToast);
    timer.current = window.setTimeout(dismiss, 4500);
  }, [dismiss]);

  useEffect(() => {
    function receive(event: Event) {
      present((event as CustomEvent<ToastMessage>).detail);
    }

    window.addEventListener(TOAST_EVENT, receive);
    const stored = window.sessionStorage.getItem(TOAST_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ToastMessage;
        queueMicrotask(() => present(parsed));
      } catch {
        window.sessionStorage.removeItem(TOAST_STORAGE_KEY);
      }
    }

    return () => {
      window.removeEventListener(TOAST_EVENT, receive);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [present]);

  return (
    <>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toast && (
          <div key={toast.id} className={`floating-toast ${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
            {toast.tone === "success"
              ? <CheckCircle2 aria-hidden="true" />
              : <CircleAlert aria-hidden="true" />}
            <p>{toast.message}</p>
            <button type="button" onClick={dismiss} aria-label="Tutup pesan">
              <X aria-hidden="true" />
            </button>
            <span className="floating-toast-progress" aria-hidden="true" />
          </div>
        )}
      </div>
    </>
  );
}
