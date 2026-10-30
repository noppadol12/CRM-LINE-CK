"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  title: z.string().trim().min(1, "ตั้งชื่อปุ่ม").max(40, "ชื่อยาวเกินไป"),
  body: z.string().trim().min(1, "พิมพ์ข้อความ").max(5000, "ข้อความยาวเกิน 5,000 ตัวอักษร"),
});

export async function saveQuickReply(id: string | null, input: { title: string; body: string }): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  if (id) {
    await prisma.quickReply.update({ where: { id }, data: parsed.data });
  } else {
    const last = await prisma.quickReply.aggregate({ _max: { sortOrder: true } });
    await prisma.quickReply.create({ data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  refresh();
  return { ok: true, message: "บันทึกข้อความสำเร็จรูปแล้ว" };
}

export async function deleteQuickReply(id: string): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await prisma.quickReply.delete({ where: { id } });
  refresh();
  return { ok: true, message: "ลบแล้ว" };
}

/** เลื่อนขึ้น/ลง โดยสลับลำดับกับรายการข้างเคียง */
export async function moveQuickReply(id: string, dir: -1 | 1): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const all = await prisma.quickReply.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = all.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((r, idx) => prisma.quickReply.update({ where: { id: r.id }, data: { sortOrder: idx } })));
  refresh();
  return { ok: true };
}
