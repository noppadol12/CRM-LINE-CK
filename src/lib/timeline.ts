import "server-only";
import { findStage } from "@/lib/deal-stages";
import { prisma } from "@/lib/prisma";
import { listStages } from "@/lib/stages";

export type TimelineKind = "chat" | "deal" | "shipment" | "note" | "task";
export type TimelineItem = { id: string; kind: TimelineKind; at: Date; title: string; body?: string | null; by?: string | null; href?: string };

const preview = (type: string, text: string | null) => text ?? `[${type.toLowerCase()}]`;

/** ทุกอย่างที่เกิดกับลูกค้ารายนี้ เรียงจากล่าสุด */
export async function customerTimeline(customerId: string, limit = 80): Promise<TimelineItem[]> {
  const [messages, events, shipments, notes, tasks, stages] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { customerId },
      orderBy: { sentAt: "desc" },
      take: 40,
      select: { id: true, direction: true, type: true, text: true, sentAt: true, senderName: true, sentBy: { select: { name: true } } },
    }),
    prisma.dealEvent.findMany({
      where: { deal: { customerId } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, type: true, fromStage: true, toStage: true, note: true, createdAt: true, actor: { select: { name: true } }, deal: { select: { title: true, amount: true } } },
    }),
    prisma.shipment.findMany({
      where: { customerId },
      orderBy: { shippedAt: "desc" },
      take: 20,
      select: { id: true, trackingNo: true, shippedAt: true, cost: true, notifiedAt: true, carrier: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.adminNote.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, body: true, createdAt: true, author: { select: { name: true } } },
    }),
    // งานที่ยังไม่ถึงเวลาอยู่ในการ์ด "งานติดตาม" แล้ว — ไทม์ไลน์แสดงเฉพาะที่เกิดขึ้นแล้ว
    prisma.task.findMany({
      where: { customerId, OR: [{ doneAt: { not: null } }, { dueAt: { lte: new Date() } }] },
      orderBy: { dueAt: "desc" },
      take: 30,
      select: { id: true, title: true, dueAt: true, doneAt: true, assignee: { select: { name: true } } },
    }),
    listStages(),
  ]);

  const items: TimelineItem[] = [
    ...messages.map((m) => ({
      id: `m-${m.id}`,
      kind: "chat" as const,
      at: m.sentAt,
      title: m.direction === "INBOUND" ? (m.senderName ? `${m.senderName} ส่งข้อความ` : "ลูกค้าส่งข้อความ") : "ร้านตอบ",
      body: preview(m.type, m.text),
      by: m.direction === "OUTBOUND" ? (m.sentBy?.name ?? null) : null,
    })),
    ...events.map((e) => ({
      id: `e-${e.id}`,
      kind: "deal" as const,
      at: e.createdAt,
      title:
        e.type === "created"
          ? `สร้างดีล “${e.deal.title}”`
          : e.type === "stage"
            ? `ดีล “${e.deal.title}” → ${findStage(stages, e.toStage).name}`
            : `แก้ไขดีล “${e.deal.title}”`,
      body: e.note,
      by: e.actor?.name ?? null,
    })),
    ...shipments.map((s) => ({
      id: `s-${s.id}`,
      kind: "shipment" as const,
      at: s.shippedAt,
      title: `ส่งของ${s.carrier ? `ทาง ${s.carrier.name}` : ""}`,
      body: [s.trackingNo && `เลขพัสดุ ${s.trackingNo}`, s.cost != null && `ค่าส่ง ฿${Number(s.cost).toLocaleString("th-TH")}`, s.notifiedAt && "แจ้งลูกค้าแล้ว"].filter(Boolean).join(" · ") || null,
      by: s.createdBy?.name ?? null,
    })),
    ...notes.map((n) => ({ id: `n-${n.id}`, kind: "note" as const, at: n.createdAt, title: "โน้ตภายใน", body: n.body, by: n.author?.name ?? null })),
    ...tasks.map((t) => ({
      id: `t-${t.id}`,
      kind: "task" as const,
      at: t.doneAt ?? t.dueAt,
      title: t.doneAt ? `ทำงานเสร็จ: ${t.title}` : `งานนัดไว้: ${t.title}`,
      by: t.assignee?.name ?? null,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
