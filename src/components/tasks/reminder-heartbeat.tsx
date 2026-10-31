"use client";

import { useEffect } from "react";
import { tickReminders } from "@/actions/tasks";

/** ขณะเปิดเว็บอยู่ เรียกเช็คงานที่ถึงเวลาทุกนาที (ระบบรวมคิวไม่ให้เตือนซ้ำ แม้เปิดหลายเครื่อง) */
export function ReminderHeartbeat() {
  useEffect(() => {
    const tick = () => {
      void tickReminders().catch(() => undefined);
    };
    const first = setTimeout(tick, 5_000);
    const t = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return null;
}
