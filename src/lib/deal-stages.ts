/** ขั้นของดีล — ใช้ได้ทั้งฝั่ง server และ client */
export const DEAL_STAGES = [
  { key: "INQUIRY", label: "สอบถาม", short: "สอบถาม", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
  { key: "QUOTED", label: "เสนอราคาแล้ว", short: "เสนอราคา", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  { key: "AWAITING_PAYMENT", label: "รอโอนเงิน", short: "รอโอน", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800", bar: "bg-amber-500" },
  { key: "SHIPPING", label: "เตรียม/จัดส่ง", short: "จัดส่ง", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
  { key: "WON", label: "ปิดการขาย", short: "ปิดได้", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  { key: "LOST", label: "ไม่ซื้อ", short: "ไม่ซื้อ", dot: "bg-rose-400", chip: "bg-rose-50 text-rose-700", bar: "bg-rose-400" },
] as const;

export type DealStageKey = (typeof DEAL_STAGES)[number]["key"];
export const OPEN_STAGES: DealStageKey[] = ["INQUIRY", "QUOTED", "AWAITING_PAYMENT", "SHIPPING"];
export const CLOSED_STAGES: DealStageKey[] = ["WON", "LOST"];

export function stageInfo(key: string) {
  return DEAL_STAGES.find((s) => s.key === key) ?? DEAL_STAGES[0];
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
