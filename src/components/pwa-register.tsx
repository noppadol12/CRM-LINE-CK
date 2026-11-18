"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker (ใช้รับแจ้งเตือน และให้ติดตั้งเป็นแอปได้) */
export function PwaRegister() {
  // iOS Safari จะแสดง :active (ปุ่มยุบตอนแตะ) ก็ต่อเมื่อมี touch listener — ให้ตอบสนองตั้งแต่นิ้วแตะ
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("[sw] register failed", e));
  }, []);
  return null;
}
