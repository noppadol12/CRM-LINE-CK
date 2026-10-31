"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Download, Loader2, Send, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { getPushPublicKey, removePushSubscription, savePushSubscription, sendTestPush } from "@/actions/push";
import { Button } from "@/components/ui/button";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function base64ToUint8(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function detect() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { ios, standalone };
}

async function currentState(): Promise<{ state: State; sub: PushSubscription | null }> {
  const { ios, standalone } = detect();
  // iPhone/iPad รับแจ้งเตือนได้เฉพาะเมื่อติดตั้งลงหน้าจอโฮมแล้ว (iOS 16.4+)
  if (ios && !standalone) return { state: "ios-install", sub: null };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { state: "unsupported", sub: null };
  }
  if (Notification.permission === "denied") return { state: "denied", sub: null };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return { state: sub ? "on" : "off", sub };
}

export function DeviceSettings() {
  const [state, setState] = useState<State>("loading");
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPrompt | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    currentState()
      .then((r) => alive && setState(r.state))
      .catch(() => alive && setState("unsupported"));
    // อ่านสถานะการติดตั้งหลัง mount (ฝั่งเซิร์ฟเวอร์ไม่รู้)
    const { standalone } = detect();
    queueMicrotask(() => alive && setInstalled(standalone));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const enable = () =>
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return void toast.error("ไม่ได้อนุญาตการแจ้งเตือน");
        }
        const reg = await navigator.serviceWorker.ready;
        const key = await getPushPublicKey();
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8(key) }));
        const r = await savePushSubscription(sub.toJSON());
        if (!r.ok) return void toast.error(r.error);
        setState("on");
        toast.success(r.message);
      } catch (e) {
        console.error(e);
        toast.error("เปิดแจ้งเตือนไม่สำเร็จ");
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("ปิดแจ้งเตือนบนเครื่องนี้แล้ว");
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Bell className="size-4" /> แจ้งเตือนเมื่อลูกค้าทักแชท
        </p>
        {state === "loading" && <p className="text-sm text-muted-foreground">กำลังตรวจสอบ…</p>}
        {state === "unsupported" && <p className="text-sm text-muted-foreground">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน ลองใช้ Chrome, Edge หรือ Safari รุ่นใหม่</p>}
        {state === "ios-install" && (
          <p className="text-sm text-muted-foreground">
            บน iPhone/iPad ต้องติดตั้งแอปก่อน: เปิดหน้านี้ใน Safari → กด <Share className="inline size-3.5" /> แชร์ → “เพิ่มไปยังหน้าจอโฮม”
            → เปิด CK CRM จากไอคอน แล้วกลับมาเปิดแจ้งเตือนที่หน้านี้
          </p>
        )}
        {state === "denied" && (
          <p className="text-sm text-muted-foreground">
            เบราว์เซอร์บล็อกการแจ้งเตือนของเว็บนี้ไว้ — เปิดได้ที่การตั้งค่าเว็บไซต์ (ไอคอนแม่กุญแจข้างแถบที่อยู่) → การแจ้งเตือน → อนุญาต
          </p>
        )}
        {state === "off" && (
          <Button onClick={enable} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Bell />}
            เปิดแจ้งเตือนบนเครื่องนี้
          </Button>
        )}
        {state === "on" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-emerald-700">เปิดอยู่บนเครื่องนี้</span>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await sendTestPush();
                  if (r.ok) toast.success(r.message);
                  else toast.error(r.error);
                })
              }
            >
              <Send /> ทดสอบ
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={disable} disabled={pending}>
              <BellOff /> ปิด
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="size-4" /> ใช้เป็นแอปบนมือถือ
        </p>
        {installed ? (
          <p className="text-sm text-emerald-700">ติดตั้งแล้ว — กำลังเปิดจากแอป</p>
        ) : installEvent ? (
          <Button
            variant="outline"
            onClick={async () => {
              await installEvent.prompt();
              const choice = await installEvent.userChoice;
              if (choice.outcome === "accepted") setInstallEvent(null);
            }}
          >
            <Download /> ติดตั้ง CK CRM
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Android (Chrome): เมนู ⋮ → “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก” · iPhone (Safari): ปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม”
          </p>
        )}
      </div>
    </div>
  );
}
