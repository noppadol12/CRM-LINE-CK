import { tagColor } from "@/lib/tag-colors";

/** ขั้นของดีล (โหลดจากตาราง deal_stages) — ใช้ได้ทั้งฝั่ง server และ client */
export type Stage = { id: string; name: string; color: string };

/** ขั้นของระบบ ลบไม่ได้ — รายงานใช้คำนวณยอดขายและอัตราปิดการขาย */
export const WON = "WON";
export const LOST = "LOST";
export const CLOSED_STAGES = [WON, LOST];
export const isClosedStage = (id: string) => id === WON || id === LOST;

export const DEFAULT_STAGES = [
  { id: "INQUIRY", name: "สอบถาม", color: "slate", sortOrder: 10 },
  { id: "QUOTED", name: "เสนอราคาแล้ว", color: "sky", sortOrder: 20 },
  { id: "AWAITING_PAYMENT", name: "รอโอนเงิน", color: "amber", sortOrder: 30 },
  { id: "SHIPPING", name: "เตรียม/จัดส่ง", color: "violet", sortOrder: 40 },
  { id: WON, name: "ปิดการขาย", color: "emerald", sortOrder: 1000 },
  { id: LOST, name: "ไม่ซื้อ", color: "rose", sortOrder: 1001 },
];

/** หาขั้นจาก id — ถ้าไม่พบ (ขั้นถูกลบไปแล้ว ใช้ในประวัติ) คืนค่าแสดงผลสำรอง */
export function findStage(stages: Stage[], id: string | null | undefined): Stage {
  return stages.find((s) => s.id === id) ?? { id: id ?? "", name: "(ขั้นที่ถูกลบ)", color: "slate" };
}

export function stageStyle(color: string) {
  const c = tagColor(color);
  return { dot: c.dot, chip: c.chip };
}

export const baht = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
export const bahtCompact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });

/** ใช้เทียบวันนัดติดตามตามเวลาไทย */
export function bangkokDayKey(d: Date | number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
}

/** สถานะวันนัดติดตามเทียบกับวันนี้ (เวลาไทย) */
export function followUpState(date: Date): "overdue" | "today" | "upcoming" {
  const today = bangkokDayKey(Date.now());
  const key = bangkokDayKey(date);
  return key < today ? "overdue" : key === today ? "today" : "upcoming";
}
