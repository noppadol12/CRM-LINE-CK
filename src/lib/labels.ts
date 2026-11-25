/** ใบปะหน้าพัสดุ — ใช้ได้ทั้ง server และ client */

export const LABEL_CARRIERS = [
  { key: "flash", name: "Flash", ids: ["flash-express"], match: /flash|แฟลช/i },
  { key: "ems", name: "EMS", ids: ["thailand-post-ems"], match: /\bems\b|ไปรษณีย์/i },
  { key: "kex", name: "KEX", ids: ["kex-express"], match: /kex|kerry|เคอรี่/i },
] as const;
export type LabelCarrierKey = (typeof LABEL_CARRIERS)[number]["key"];

/** แปลงขนส่งในระบบ → ช่องติ๊กบนใบปะหน้า (ไม่ตรง = ว่าง ให้ติ๊กมือ) */
export function labelCarrierOf(carrier: { id: string; name: string } | null | undefined): LabelCarrierKey | "" {
  if (!carrier) return "";
  const hit = LABEL_CARRIERS.find((c) => (c.ids as readonly string[]).includes(carrier.id) || c.match.test(carrier.name));
  return hit?.key ?? "";
}

export type LabelLayout = "4" | "2";
export const LABEL_LAYOUTS: { value: LabelLayout; label: string; hint: string }[] = [
  { value: "4", label: "A4 แบ่ง 4 ช่อง", hint: "4 ใบต่อแผ่น" },
  { value: "2", label: "A5 (2 ใบต่อ A4)", hint: "ตัวใหญ่ ตัดครึ่งแผ่น" },
];

/** ข้อมูลหนึ่งรายการส่ง (หลายกล่อง = หลายใบ) */
export type LabelInput = {
  name: string;
  company?: string;
  phone?: string;
  address: string;
  note?: string;
  ref?: string;
  carrier: LabelCarrierKey | "";
  boxes: number;
  date: string; // YYYY-MM-DD
};

export type Sender = { name: string; phone: string; address: string };
export const DEFAULT_SENDER: Sender = {
  name: "หจก.ซี.เค แอร์คอนด์",
  phone: "080-8265970",
  address: "190/51 ม.1 ต.บางขะแยง อ.เมืองปทุมธานี จ.ปทุมธานี 12000",
};

export const MAX_BOXES = 50;

/** กระจายเป็นใบ ๆ: กล่อง 1/3, 2/3, 3/3 */
export function expandLabels(items: LabelInput[]) {
  return items.flatMap((it) => {
    const n = Math.max(1, Math.min(MAX_BOXES, Math.round(it.boxes) || 1));
    return Array.from({ length: n }, (_, i) => ({ ...it, box: `${i + 1}/${n}` }));
  });
}
export type Label = ReturnType<typeof expandLabels>[number];

/** เข้ารหัสข้อมูลจากหน้าต่างพิมพ์ ใส่ใน URL (base64url ของ JSON) */
export function encodeLabels(items: LabelInput[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(items));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
