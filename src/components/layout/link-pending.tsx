"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * ใส่ไว้ใน <Link> — แสดงสัญญาณ "กำลังเปิด" ทันทีที่กด ระหว่างรอโหลดหน้า
 * (หน่วง 120ms ก่อนโชว์ กันกะพริบเมื่อหน้าเปิดเร็วอยู่แล้ว)
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none opacity-0 transition-opacity",
        pending && "animate-pulse opacity-100 delay-[120ms]",
        className,
      )}
    />
  );
}
