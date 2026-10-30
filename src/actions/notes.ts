"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { canManage, NO_PERMISSION, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function addNote(customerId: string, body: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const text = body.trim();
  if (!text) return { ok: false, error: "กรุณาพิมพ์โน้ต" };
  if (text.length > 2000) return { ok: false, error: "โน้ตยาวเกิน 2,000 ตัวอักษร" };

  await prisma.adminNote.create({ data: { customerId, authorId: user.id, body: text } });
  refresh();
  return { ok: true };
}

export async function toggleNotePin(noteId: string): Promise<ActionResult> {
  await getCurrentUser();
  const note = await prisma.adminNote.findUnique({ where: { id: noteId }, select: { isPinned: true } });
  if (!note) return { ok: false, error: "ไม่พบโน้ต" };
  await prisma.adminNote.update({ where: { id: noteId }, data: { isPinned: !note.isPinned } });
  refresh();
  return { ok: true };
}

/** ลบได้เฉพาะโน้ตของตัวเอง หรือเป็นเจ้าของ/แอดมิน */
export async function deleteNote(noteId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const note = await prisma.adminNote.findUnique({ where: { id: noteId }, select: { authorId: true } });
  if (!note) return { ok: false, error: "ไม่พบโน้ต" };
  if (note.authorId !== user.id && !canManage(user)) return NO_PERMISSION;
  await prisma.adminNote.delete({ where: { id: noteId } });
  refresh();
  return { ok: true, message: "ลบโน้ตแล้ว" };
}
