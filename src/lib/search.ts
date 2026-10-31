import "server-only";
import { prisma } from "@/lib/prisma";

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** ค้นทั้งระบบ: ลูกค้า · ข้อความในแชท · ดีล · โน้ต · เลขพัสดุ */
export async function searchAll(q: string) {
  const digits = q.replace(/\D/g, "");
  const live = { deletedAt: null };
  const [customers, messages, deals, notes, shipments] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...live,
        OR: [
          { fullName: ci(q) },
          { lineName: ci(q) },
          { company: ci(q) },
          { email: ci(q) },
          { address: ci(q) },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      take: 20,
      select: { id: true, fullName: true, lineName: true, lineUserId: true, company: true, phone: true, province: true, chatType: true },
    }),
    prisma.chatMessage.findMany({
      where: { text: ci(q), customer: live },
      orderBy: { sentAt: "desc" },
      take: 50,
      select: {
        id: true,
        text: true,
        direction: true,
        sentAt: true,
        senderName: true,
        sentBy: { select: { name: true } },
        customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true } },
      },
    }),
    prisma.deal.findMany({
      where: { customer: live, OR: [{ title: ci(q) }, { items: ci(q) }, { quoteNo: ci(q) }] },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, items: true, quoteNo: true, stage: true, customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true } } },
    }),
    prisma.adminNote.findMany({
      where: { body: ci(q), customer: live },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, body: true, createdAt: true, customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true } } },
    }),
    prisma.shipment.findMany({
      where: { trackingNo: ci(q) },
      orderBy: { shippedAt: "desc" },
      take: 10,
      select: { id: true, trackingNo: true, shippedAt: true, carrier: { select: { name: true } }, customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true } } },
    }),
  ]);
  return { customers, messages, deals, notes, shipments };
}
