import "server-only";
import { cache } from "react";
import { DEFAULT_STAGES, LOST, WON, type Stage } from "@/lib/deal-stages";
import { prisma } from "@/lib/prisma";

/** ขั้นทั้งหมดเรียงตามลำดับ: ขั้นที่เปิดอยู่ (ตาม sortOrder) → ปิดการขาย → ไม่ซื้อ */
export const listStages = cache(async (): Promise<Stage[]> => {
  let rows = await prisma.dealStageDef.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  // กันกรณีฐานข้อมูลยังไม่มีขั้นของระบบ (เช่น ก่อน seed)
  if (!rows.some((r) => r.id === WON) || !rows.some((r) => r.id === LOST)) {
    for (const s of DEFAULT_STAGES.filter((d) => d.id === WON || d.id === LOST)) {
      await prisma.dealStageDef.upsert({ where: { id: s.id }, update: {}, create: s });
    }
    rows = await prisma.dealStageDef.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  }
  const open = rows.filter((r) => r.id !== WON && r.id !== LOST);
  const won = rows.find((r) => r.id === WON)!;
  const lost = rows.find((r) => r.id === LOST)!;
  return [...open, won, lost].map((r) => ({ id: r.id, name: r.name, color: r.color }));
});

export async function openStages() {
  return (await listStages()).filter((s) => s.id !== WON && s.id !== LOST);
}
