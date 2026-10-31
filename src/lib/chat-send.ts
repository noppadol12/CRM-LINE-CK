import "server-only";
import { lineErrorMessage, sendToCustomer } from "@/lib/line-send";
import { prisma } from "@/lib/prisma";

/** ส่งข้อความตัวอักษรหาลูกค้า/กลุ่ม แล้วบันทึกในประวัติแชท (ใช้จากส่วนอื่นนอกห้องแชท เช่น แจ้งเลขพัสดุ) */
export async function sendTextAsUser(customerId: string, userId: string, text: string): Promise<{ ok: true; via: "reply" | "push" } | { ok: false; error: string }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, lineUserId: true, followStatus: true, lastReplyToken: true, lastReplyTokenAt: true },
  });
  if (!customer?.lineUserId) return { ok: false, error: "ลูกค้ารายนี้ไม่มีบัญชี LINE" };
  if (customer.followStatus === "UNFOLLOWED") return { ok: false, error: "ลูกค้าบล็อก OA แล้ว (หรือ OA ไม่ได้อยู่ในกลุ่ม)" };

  let sent;
  try {
    sent = await sendToCustomer({ ...customer, lineUserId: customer.lineUserId }, [{ type: "text", text: text.slice(0, 5000) }]);
  } catch (e) {
    return { ok: false, error: lineErrorMessage(e) };
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { customerId, direction: "OUTBOUND", type: "TEXT", text, lineMessageId: sent.messageIds[0] ?? null, sentVia: sent.via, sentById: userId, sentAt: now },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { lastMessageAt: now, lastMessagePreview: `คุณ: ${text}`.slice(0, 200), unreadCount: 0 },
    }),
  ]);
  return { ok: true, via: sent.via };
}
