"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { canManage, NO_PERMISSION, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { maybeProcessReminders } from "@/lib/tasks";

const TaskSchema = z.object({
  title: z.string().trim().min(1, "พิมพ์ว่าต้องทำอะไร").max(200),
  note: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
  // จาก <input type="datetime-local"> ตีความเป็นเวลาไทย
  dueAt: z
    .string()
    .min(1, "เลือกวันเวลา")
    .transform((v) => new Date(`${v.length === 16 ? `${v}:00` : v}+07:00`))
    .refine((d) => !Number.isNaN(d.getTime()), "วันเวลาไม่ถูกต้อง"),
  customerId: z.string().nullish().transform((v) => v || null),
  dealId: z.string().nullish().transform((v) => v || null),
  assigneeId: z.string().nullish().transform((v) => v || null),
});
export type TaskInput = z.input<typeof TaskSchema>;

export async function saveTask(id: string | null, input: TaskInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = TaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = { ...parsed.data, assigneeId: parsed.data.assigneeId ?? user.id };

  if (id) {
    const current = await prisma.task.findUnique({ where: { id }, select: { dueAt: true } });
    if (!current) return { ok: false, error: "ไม่พบงาน" };
    // เลื่อนเวลา → เตือนใหม่อีกครั้ง
    const moved = current.dueAt.getTime() !== data.dueAt.getTime();
    await prisma.task.update({ where: { id }, data: { ...data, ...(moved ? { remindedAt: null } : {}) } });
  } else {
    await prisma.task.create({ data: { ...data, createdById: user.id } });
  }
  refresh();
  return { ok: true, message: id ? "บันทึกแล้ว" : "เพิ่มงานแล้ว จะแจ้งเตือนเมื่อถึงเวลา" };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  await getCurrentUser();
  await prisma.task.update({ where: { id }, data: { doneAt: done ? new Date() : null } });
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const t = await prisma.task.findUnique({ where: { id }, select: { createdById: true, assigneeId: true } });
  if (!t) return { ok: false, error: "ไม่พบงาน" };
  if (t.createdById !== user.id && t.assigneeId !== user.id && !canManage(user)) return NO_PERMISSION;
  await prisma.task.delete({ where: { id } });
  refresh();
  return { ok: true, message: "ลบงานแล้ว" };
}

/** ข้อมูลสำหรับฟอร์มงาน: ทีมงาน + ดีลของลูกค้า */
export async function getTaskFormData(customerId: string | null) {
  const user = await getCurrentUser();
  const [team, deals] = await Promise.all([
    prisma.adminUser.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    customerId
      ? prisma.deal.findMany({ where: { customerId }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);
  return { team, deals, me: user.id };
}

/** หน้าเว็บที่เปิดอยู่เรียกทุกนาที เพื่อส่งแจ้งเตือนงานที่ถึงเวลา (Vercel ฟรีตั้ง Cron ได้วันละครั้ง) */
export async function tickReminders(): Promise<void> {
  await getCurrentUser();
  await maybeProcessReminders();
}
