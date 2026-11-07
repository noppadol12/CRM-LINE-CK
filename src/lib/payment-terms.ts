/** เงื่อนไขการชำระเงินของลูกค้า (ใช้ได้ทั้งฝั่ง server และ client) */
export const PAYMENT_TERMS = {
  cash: { label: "เงินสด", short: "เงินสด", hint: "โอน/จ่ายก่อนส่งของ", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  credit: { label: "เครดิต", short: "เครดิต", hint: "ส่งของก่อน วางบิลเก็บเงินภายหลัง", chip: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  pdc: { label: "โพสต์เดตเช็ค", short: "เช็ค", hint: "จ่ายด้วยเช็คลงวันที่ล่วงหน้า", chip: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
} as const;

export type PaymentTerm = keyof typeof PAYMENT_TERMS;
export const PAYMENT_TERM_IDS = Object.keys(PAYMENT_TERMS) as PaymentTerm[];
export const CREDIT_DAY_PRESETS = [7, 15, 30, 45, 60, 90];

export function isPaymentTerm(v: unknown): v is PaymentTerm {
  return typeof v === "string" && v in PAYMENT_TERMS;
}

/** ข้อความเต็ม เช่น "เครดิต 30 วัน", "โพสต์เดตเช็ค 60 วัน", "เงินสด" */
export function paymentTermLabel(term: string | null | undefined, days?: number | null, { short = false } = {}) {
  if (!isPaymentTerm(term)) return null;
  const t = PAYMENT_TERMS[term];
  const base = short ? t.short : t.label;
  return term !== "cash" && days ? `${base} ${days}${short ? "ว." : " วัน"}` : base;
}
