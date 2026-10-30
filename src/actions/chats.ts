"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getLineClient } from "@/lib/line";
import type { ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const MAX_TEXT = 5000; // ข้อจำกัดของ LINE text message

function lineErrorMessage(e: unknown): string {
  const status = (e as { status?: number; statusCode?: number })?.status ?? (e as { statusCode?: number })?.statusCode;
  const msg = e instanceof Error ? e.message : String(e);
  if (status === 429 || /429/.test(msg)) return "โควตาข้อความ LINE เดือนนี้หมดแล้ว หรือส่งถี่เกินไป";
  if (status === 401 || /401/.test(msg)) return "Channel access token ไม่ถูกต้องหรือหมดอายุ";
  if (status === 400 || /400/.test(msg)) return "LINE ปฏิเสธข้อความ (ลูกค้าอาจบล็อก OA แล้ว)";
  return `ส่งไม่สำเร็จ: ${msg.slice(0, 200)}`;
}

/** ส่งข้อความหาลูกค้าผ่าน LINE Push API แล้วบันทึกลงประวัติแชท */
export async function sendChatMessage(customerId: string, rawText: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const text = rawText.trim();
  if (!text) return { ok: false, error: "พิมพ์ข้อความก่อนส่ง" };
  if (text.length > MAX_TEXT) return { ok: false, error: `ข้อความยาวเกิน ${MAX_TEXT.toLocaleString()} ตัวอักษร` };

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { lineUserId: true, followStatus: true, deletedAt: true },
  });
  if (!customer?.lineUserId) return { ok: false, error: "ลูกค้ารายนี้ไม่มีบัญชี LINE" };
  if (customer.followStatus === "UNFOLLOWED") return { ok: false, error: "ลูกค้าบล็อก OA แล้ว ส่งข้อความไม่ได้" };

  const client = getLineClient();
  if (!client) return { ok: false, error: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" };

  let lineMessageId: string | null = null;
  try {
    // retry key กันข้อความซ้ำถ้า request หลุดแล้วส่งใหม่
    const res = await client.pushMessage({ to: customer.lineUserId, messages: [{ type: "text", text }] }, randomUUID());
    lineMessageId = res.sentMessages?.[0]?.id ?? null;
  } catch (e) {
    console.error("[chat] push failed", e);
    return { ok: false, error: lineErrorMessage(e) };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { customerId, direction: "OUTBOUND", type: "TEXT", text, lineMessageId, sentById: user.id, sentAt: now },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { lastMessageAt: now, lastMessagePreview: `คุณ: ${text}`.slice(0, 200), unreadCount: 0, deletedAt: null },
    }),
    prisma.chatMessage.updateMany({
      where: { customerId, direction: "INBOUND", readAt: null },
      data: { readAt: now },
    }),
  ]);

  refresh();
  return { ok: true };
}

/** เปิดอ่านห้องแชท → ล้างจำนวนรอตอบ */
export async function markConversationRead(customerId: string): Promise<ActionResult> {
  await getCurrentUser();
  const now = new Date();
  const res = await prisma.customer.updateMany({ where: { id: customerId, unreadCount: { gt: 0 } }, data: { unreadCount: 0 } });
  if (res.count > 0) {
    await prisma.chatMessage.updateMany({ where: { customerId, direction: "INBOUND", readAt: null }, data: { readAt: now } });
    refresh();
  }
  return { ok: true };
}

/** ทำเครื่องหมายว่ายังไม่อ่าน (ไว้กลับมาตอบทีหลัง) */
export async function markConversationUnread(customerId: string): Promise<ActionResult> {
  await getCurrentUser();
  await prisma.customer.update({ where: { id: customerId }, data: { unreadCount: { increment: 1 } } });
  refresh();
  return { ok: true };
}
