"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vercel serverless ไม่มี WebSocket ถาวร → ดึงข้อมูลใหม่ทุก N วินาที
 * หยุดเมื่อแท็บถูกซ่อน และดึงทันทีเมื่อกลับมาที่แท็บ
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      timer = setInterval(() => router.refresh(), intervalMs);
    };
    const stop = () => timer && clearInterval(timer);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
