import { formatDistanceToNowStrict } from "date-fns";
import { th } from "date-fns/locale";

/** เก็บเบอร์โทรเป็นตัวเลขล้วน เพื่อให้ค้นหาได้ทั้งแบบมีและไม่มีขีด */
export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length >= 11) digits = `0${digits.slice(2)}`; // +66 → 0
  return digits || null;
}

/** แสดงเบอร์แบบไทย: 0812345678 → 081-234-5678, 025550199 → 02-555-0199 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9 && d.startsWith("02")) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  if (d.length === 9) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export function displayName(c: { fullName?: string | null; lineName?: string | null; lineUserId?: string | null }): string {
  return (
    c.fullName?.trim() ||
    c.lineName?.trim() ||
    (c.lineUserId
      ? c.lineUserId.startsWith("C")
        ? `กลุ่ม LINE ···${c.lineUserId.slice(-4)}`
        : c.lineUserId.startsWith("R")
          ? `แชทหลายคน ···${c.lineUserId.slice(-4)}`
          : `ผู้ใช้ LINE ···${c.lineUserId.slice(-4)}`
      : "ไม่ระบุชื่อ")
  );
}

const dateTimeTH = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const dateTH = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (d: Date) => dateTimeTH.format(d);
export const formatDate = (d: Date) => dateTH.format(d);

/** "3 ชั่วโมงที่ผ่านมา" / "เมื่อสักครู่" */
export function timeAgo(d: Date): string {
  if (Date.now() - d.getTime() < 60_000) return "เมื่อสักครู่";
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: th });
}
