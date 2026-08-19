"use client";

import { Bell, BellRing, CheckCheck, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/app/actions/push";
import { showToast } from "@/components/ui/toast-provider";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: "task_due" | "event_reminder" | "system";
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
};

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function NotificationCenter() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pushState, setPushState] = useState<"checking" | "available" | "enabled" | "denied" | "unavailable">("checking");
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { notifications: NotificationItem[] };
      setNotifications(payload.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    async function checkPush() {
      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushState("unavailable");
        return;
      }
      if (Notification.permission === "denied") {
        setPushState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      setPushState(subscription ? "enabled" : "available");
    }
    checkPush().catch(() => setPushState("unavailable"));
  }, [vapidKey]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (open && panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  async function enablePush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "available");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(vapidKey) });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) throw new Error("Browser tidak mengembalikan kunci push yang lengkap.");
      await subscribeToPush({ endpoint: serialized.endpoint, p256dh: serialized.keys.p256dh, authKey: serialized.keys.auth });
      setPushState("enabled");
      showToast("success", "Notifikasi browser berhasil diaktifkan.");
    } catch (caught) {
      showToast("error", caught instanceof Error ? caught.message : "Notifikasi browser belum dapat diaktifkan.");
    }
  }

  async function disablePush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushState("available");
      showToast("success", "Notifikasi browser dinonaktifkan.");
    } catch (caught) {
      showToast("error", caught instanceof Error ? caught.message : "Notifikasi browser belum dapat dinonaktifkan.");
    }
  }

  async function markRead(item: NotificationItem) {
    if (!item.read_at) {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      if (response.ok) setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, read_at: new Date().toISOString() } : notification));
    }
    setOpen(false);
    router.push(item.type === "event_reminder" ? "/events" : "/");
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    if (response.ok) setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  }

  return <div className="notification-center" ref={panelRef}>
    <button type="button" className="icon-button notification-trigger" onClick={() => setOpen((value) => !value)} aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`} aria-expanded={open}>{unreadCount ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}{unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
    {open && <div className="notification-panel" role="dialog" aria-label="Notifikasi">
      <header><div><p className="section-kicker">Pembaruan terbaru</p><h2>Notifikasi</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Tutup notifikasi"><X /></button></header>
      <div className="notification-tools">{pushState === "available" && <button type="button" onClick={enablePush}>Aktifkan notifikasi browser</button>}{pushState === "enabled" && <button type="button" onClick={disablePush}>Nonaktifkan push</button>}{pushState === "denied" && <span>Izin notifikasi diblokir oleh browser.</span>}{pushState === "unavailable" && <span>Push belum tersedia pada perangkat ini.</span>}{unreadCount > 0 && <button type="button" onClick={markAllRead}><CheckCheck /> Tandai dibaca</button>}</div>
      <div className="notification-list">{loading ? <div className="notification-empty"><Loader2 className="spin" /><span>Memuat notifikasi...</span></div> : notifications.length === 0 ? <div className="notification-empty"><Bell /><span>Belum ada notifikasi.</span></div> : notifications.map((item) => <button type="button" key={item.id} className={item.read_at ? "read" : ""} onClick={() => markRead(item)}><i aria-hidden="true" /><span><strong>{item.title}</strong>{item.body && <small>{item.body}</small>}<time>{formatTime(item.created_at)}</time></span></button>)}</div>
    </div>}
  </div>;
}
