"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker (ใช้รับแจ้งเตือน และให้ติดตั้งเป็นแอปได้) */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("[sw] register failed", e));
  }, []);
  return null;
}
