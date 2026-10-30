/**
 * สีแท็ก — เขียนชื่อคลาสเต็มเพื่อให้ Tailwind สร้าง CSS ให้
 * ค่า key ถูกเก็บในคอลัมน์ tags.color
 */
export const TAG_COLORS = {
  slate: { label: "เทา", chip: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-500" },
  sky: { label: "ฟ้า", chip: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  emerald: { label: "เขียว", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  amber: { label: "เหลือง", chip: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  orange: { label: "ส้ม", chip: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" },
  rose: { label: "ชมพู", chip: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  violet: { label: "ม่วง", chip: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  teal: { label: "เขียวอมฟ้า", chip: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" },
} as const;

export type TagColor = keyof typeof TAG_COLORS;
export const TAG_COLOR_KEYS = Object.keys(TAG_COLORS) as TagColor[];

export function tagColor(color: string) {
  return TAG_COLORS[(color in TAG_COLORS ? color : "slate") as TagColor];
}
