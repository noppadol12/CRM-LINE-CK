"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { isClosedStage } from "@/lib/deal-stages";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { TAG_COLOR_KEYS } from "@/lib/tag-colors";

const StageSchema = z.object({
  name: z.string().trim().min(1, "ตั้งชื่อขั้น").max(40, "ชื่อยาวเกิน 40 ตัวอักษร"),
  color: z.enum(TAG_COLOR_KEYS as [string, ...string[]]),
});

const MAX_OPEN_STAGES = 12;

/** ขั้นที่เปิดอยู่ (ไม่รวมปิดการขาย/ไม่ซื้อ) เรียงตามลำดับ */
function openStagesOrdered() {
  return prisma.dealStageDef.findMany({
    where: { id: { notIn: ["WON", "LOST"] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
}

export async function createStage(input: { name: string; color: string }): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const parsed = StageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const open = await openStagesOrdered();
  if (open.length >= MAX_OPEN_STAGES) return { ok: false, error: `เพิ่มได้สูงสุด ${MAX_OPEN_STAGES} ขั้น` };
  const last = await prisma.dealStageDef.aggregate({ where: { id: { notIn: ["WON", "LOST"] } }, _max: { sortOrder: true } });
  // ต่อท้ายขั้นที่เปิดอยู่ (ก่อน "ปิดการขาย" เสมอ)
  await prisma.dealStageDef.create({ data: { ...parsed.data, sortOrder: Math.min((last._max.sortOrder ?? 0) + 10, 999) } });
  refresh();
  return { ok: true, message: `เพิ่มขั้น "${parsed.data.name}" แล้ว` };
}

export async function updateStage(id: string, input: { name: string; color: string }): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const parsed = StageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const r = await prisma.dealStageDef.updateMany({ where: { id }, data: parsed.data });
  if (r.count === 0) return { ok: false, error: "ไม่พบขั้นนี้" };
  refresh();
  return { ok: true, message: "บันทึกแล้ว" };
}

/** เลื่อนขึ้น/ลง — เขียนลำดับใหม่ทั้งชุด (10, 20, 30…) */
export async function moveStage(id: string, direction: -1 | 1): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  if (isClosedStage(id)) return { ok: false, error: "ขั้นปิดการขาย/ไม่ซื้ออยู่ท้ายสุดเสมอ" };
  const ids = (await openStagesOrdered()).map((s) => s.id);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await prisma.$transaction(ids.map((sid, k) => prisma.dealStageDef.update({ where: { id: sid }, data: { sortOrder: (k + 1) * 10 } })));
  refresh();
  return { ok: true };
}

/** ลบขั้น — ถ้ามีดีลอยู่ต้องเลือกขั้นที่จะย้ายดีลไป */
export async function deleteStage(id: string, moveTo: string | null): Promise<ActionResult> {
  const user = await requireManager();
  if (!user) return NO_PERMISSION;
  if (isClosedStage(id)) return { ok: false, error: "ขั้นปิดการขาย/ไม่ซื้อเป็นขั้นของระบบ ลบไม่ได้ (เปลี่ยนชื่อได้)" };
  const open = await openStagesOrdered();
  if (open.length <= 1) return { ok: false, error: "ต้องมีขั้นที่เปิดอยู่อย่างน้อย 1 ขั้น" };

  const count = await prisma.deal.count({ where: { stage: id } });
  if (count > 0) {
    if (!moveTo || moveTo === id || isClosedStage(moveTo) || !open.some((s) => s.id === moveTo)) {
      return { ok: false, error: "เลือกขั้นที่จะย้ายดีลไป" };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (count > 0 && moveTo) {
      const deals = await tx.deal.findMany({ where: { stage: id }, select: { id: true } });
      await tx.deal.updateMany({ where: { stage: id }, data: { stage: moveTo, stageChangedAt: new Date() } });
      await tx.dealEvent.createMany({
        data: deals.map((d) => ({ dealId: d.id, type: "stage", fromStage: id, toStage: moveTo, actorId: user.id, note: "ย้ายอัตโนมัติเพราะลบขั้น" })),
      });
    }
    await tx.dealStageDef.delete({ where: { id } });
  });
  refresh();
  return { ok: true, message: count > 0 ? `ลบขั้นแล้ว ย้ายดีล ${count} รายการ` : "ลบขั้นแล้ว" };
}
