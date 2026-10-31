import "server-only";
import { randomUUID } from "node:crypto";
import type { messagingApi } from "@line/bot-sdk";
import { getLineClient } from "@/lib/line";
import { prisma } from "@/lib/prisma";

/**
 * reply token ใช้ได้ครั้งเดียวและมีอายุสั้น (LINE ระบุประมาณ 1 นาทีหลังได้รับ webhook)
 * เผื่อเวลาเครือข่ายไว้ ใช้เฉพาะ token ที่อายุไม่เกิน 50 วินาที
 */
export const REPLY_WINDOW_MS = 50_000;

export type SendResult = { via: "reply" | "push"; messageIds: (string | null)[] };

function statusOf(e: unknown): number | undefined {
  return (e as { status?: number })?.status ?? (e as { statusCode?: number })?.statusCode;
}

export function lineErrorMessage(e: unknown): string {
  const status = statusOf(e);
  const msg = e instanceof Error ? e.message : String(e);
  if (status === 429 || /429/.test(msg)) return "โควตาข้อความ LINE เดือนนี้หมดแล้ว หรือส่งถี่เกินไป";
  if (status === 401 || /401/.test(msg)) return "Channel access token ไม่ถูกต้องหรือหมดอายุ";
  if (status === 400 || /400/.test(msg)) return "LINE ปฏิเสธข้อความ (ลูกค้าอาจบล็อก OA แล้ว หรือรูปแบบไฟล์ไม่รองรับ)";
  return `ส่งไม่สำเร็จ: ${msg.slice(0, 200)}`;
}

/**
 * ส่งข้อความหาลูกค้า: ใช้ Reply API (ฟรี) ถ้ามี reply token ที่ยังสด ไม่งั้นใช้ Push API (นับโควตา)
 * token ถูก "จอง" แบบมีเงื่อนไข จึงไม่มีสองคนใช้ token เดียวกันพร้อมกัน
 * throw เมื่อส่งไม่สำเร็จ
 */
export async function sendToCustomer(
  customer: { id: string; lineUserId: string; lastReplyToken: string | null; lastReplyTokenAt: Date | null },
  messages: messagingApi.Message[],
): Promise<SendResult> {
  const client = getLineClient();
  if (!client) throw new Error("ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN");

  const token = customer.lastReplyToken;
  const fresh = token && customer.lastReplyTokenAt && Date.now() - customer.lastReplyTokenAt.getTime() < REPLY_WINDOW_MS;
  if (token && fresh) {
    const claimed = await prisma.customer.updateMany({
      where: { id: customer.id, lastReplyToken: token },
      data: { lastReplyToken: null, lastReplyTokenAt: null },
    });
    if (claimed.count === 1) {
      try {
        const res = await client.replyMessage({ replyToken: token, messages });
        return { via: "reply", messageIds: (res.sentMessages ?? []).map((m) => m.id ?? null) };
      } catch (e) {
        // token หมดอายุ/ใช้ไปแล้ว (400) → ส่งแบบ push แทน; error อื่นให้แจ้งผู้ใช้ (กันส่งซ้ำ)
        if (statusOf(e) !== 400) throw e;
        console.warn("[line] reply token rejected, falling back to push");
      }
    }
  }

  // retry key กันข้อความซ้ำถ้า request หลุดแล้วส่งใหม่
  const res = await client.pushMessage({ to: customer.lineUserId, messages }, randomUUID());
  return { via: "push", messageIds: (res.sentMessages ?? []).map((m) => m.id ?? null) };
}

export type MessageQuota = { limit: number | null; used: number };

/** โควตาข้อความเดือนนี้ (Push/Broadcast — ข้อความแบบ Reply ไม่นับ) */
export async function getMessageQuota(): Promise<MessageQuota | null> {
  const client = getLineClient();
  if (!client) return null;
  try {
    const [quota, usage] = await Promise.all([client.getMessageQuota(), client.getMessageQuotaConsumption()]);
    return { limit: quota.type === "limited" ? (quota.value ?? null) : null, used: usage.totalUsage ?? 0 };
  } catch (e) {
    console.error("[line] quota", e);
    return null;
  }
}
