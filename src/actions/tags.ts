"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { TAG_COLOR_KEYS } from "@/lib/tag-colors";

const TagSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อแท็ก").max(40, "ชื่อแท็กยาวเกินไป"),
  color: z.enum(TAG_COLOR_KEYS as [string, ...string[]]).default("slate"),
});

async function nameTaken(name: string, exceptId?: string) {
  return prisma.tag.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
}

export async function createTag(input: { name: string; color: string }): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  if (!(await requireManager())) return NO_PERMISSION;
  const parsed = TagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (await nameTaken(parsed.data.name)) return { ok: false, error: "มีแท็กชื่อนี้แล้ว" };

  const tag = await prisma.tag.create({ data: parsed.data, select: { id: true, name: true, color: true } });
  refresh();
  return { ok: true, message: `สร้างแท็ก "${tag.name}" แล้ว`, data: tag };
}

export async function updateTag(id: string, input: { name: string; color: string }): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const parsed = TagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (await nameTaken(parsed.data.name, id)) return { ok: false, error: "มีแท็กชื่อนี้แล้ว" };

  await prisma.tag.update({ where: { id }, data: parsed.data });
  refresh();
  return { ok: true, message: "บันทึกแท็กแล้ว" };
}

export async function deleteTag(id: string): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await prisma.tag.delete({ where: { id } });
  refresh();
  return { ok: true, message: "ลบแท็กแล้ว" };
}
