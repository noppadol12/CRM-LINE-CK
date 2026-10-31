import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { displayName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { getSetting, setSetting } from "@/lib/settings";

const DAY = 86_400_000;

/** สิ้นวันนี้ตามเวลาไทย */
export function endOfTodayBangkok() {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23 - 7, 59, 59, 999));
}

export const taskInclude = {
  customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true } },
  deal: { select: { id: true, title: true } },
  assignee: { select: { id: true, name: true } },
} as const satisfies Prisma.TaskInclude;

export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function toTaskDTO(t: TaskRow) {
  return {
    id: t.id,
    title: t.title,
    note: t.note,
    dueAt: t.dueAt,
    doneAt: t.doneAt,
    customer: t.customer,
    deal: t.deal,
    assignee: t.assignee,
  };
}
export type TaskDTO = ReturnType<typeof toTaskDTO>;

/** งานที่ยังไม่เสร็จ (เลยกำหนด + วันนี้ + ข้างหน้า) และงานที่เสร็จใน 7 วัน */
export async function listTasks(opts: { assigneeId?: string | null; customerId?: string; includeDone?: boolean; take?: number }) {
  const where: Prisma.TaskWhereInput = {
    ...(opts.assigneeId !== undefined ? { assigneeId: opts.assigneeId } : {}),
    ...(opts.customerId ? { customerId: opts.customerId } : {}),
  };
  const [open, done] = await Promise.all([
    prisma.task.findMany({ where: { ...where, doneAt: null }, orderBy: { dueAt: "asc" }, take: opts.take ?? 300, include: taskInclude }),
    opts.includeDone
      ? prisma.task.findMany({
          where: { ...where, doneAt: { gte: new Date(Date.now() - 7 * DAY) } },
          orderBy: { doneAt: "desc" },
          take: 50,
          include: taskInclude,
        })
      : Promise.resolve([] as TaskRow[]),
  ]);
  return { open, done };
}

/** จำนวนงานที่ถึงกำหนดวันนี้หรือเลยกำหนด ของผู้ใช้คนนี้ (แสดงข้างเมนู) */
export function dueTaskCount(userId: string) {
  return prisma.task.count({ where: { assigneeId: userId, doneAt: null, dueAt: { lte: endOfTodayBangkok() } } });
}

const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

/**
 * ส่งแจ้งเตือนงานที่ถึงเวลา — เรียกซ้ำได้ (จองงานด้วย remindedAt ก่อนส่ง กันเตือนซ้ำ)
 * เรียกจาก: หน้าเว็บที่เปิดอยู่ (ทุกนาที) · webhook ของ LINE · Cron
 */
export async function processDueReminders() {
  const due = await prisma.task.findMany({
    where: { doneAt: null, remindedAt: null, dueAt: { lte: new Date(Date.now() + 30_000), gte: new Date(Date.now() - 2 * DAY) } },
    orderBy: { dueAt: "asc" },
    take: 50,
    include: taskInclude,
  });
  let sent = 0;
  for (const t of due) {
    const claimed = await prisma.task.updateMany({ where: { id: t.id, remindedAt: null }, data: { remindedAt: new Date() } });
    if (claimed.count === 0) continue;
    const who = t.assigneeId ?? t.createdById;
    const body = [timeFmt.format(t.dueAt), t.customer ? displayName(t.customer) : null, t.note].filter(Boolean).join(" · ");
    await sendPush(
      { title: `⏰ ${t.title}`, body: body.slice(0, 160), url: t.customer ? `/chats?c=${t.customer.id}` : "/tasks", tag: `task-${t.id}` },
      who ? { userIds: [who] } : {},
    );
    sent++;
  }
  return sent;
}

/** เรียก processDueReminders ไม่ถี่เกินทุก 45 วินาที (หลายเครื่องเปิดเว็บพร้อมกัน) */
export async function maybeProcessReminders() {
  try {
    const last = await getSetting<{ at: string }>("reminders_tick");
    if (last && Date.now() - new Date(last.at).getTime() < 45_000) return 0;
    await setSetting("reminders_tick", { at: new Date().toISOString() });
    return await processDueReminders();
  } catch (e) {
    console.error("[tasks] reminders failed", e);
    return 0;
  }
}

/** สรุปงานตอนเช้า: แจ้งแต่ละคนว่าวันนี้มีงานกี่รายการ */
export async function sendMorningSummary() {
  const rows = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: { doneAt: null, dueAt: { lte: endOfTodayBangkok() }, assigneeId: { not: null } },
    _count: true,
  });
  const overdue = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: { doneAt: null, dueAt: { lt: new Date() }, assigneeId: { not: null } },
    _count: true,
  });
  for (const r of rows) {
    const late = overdue.find((o) => o.assigneeId === r.assigneeId)?._count ?? 0;
    await sendPush(
      { title: "งานวันนี้", body: `มีงานที่ต้องทำ ${r._count} รายการ${late ? ` (เลยกำหนด ${late})` : ""}`, url: "/tasks", tag: "tasks-morning" },
      { userIds: [r.assigneeId!] },
    );
  }
  return rows.length;
}
