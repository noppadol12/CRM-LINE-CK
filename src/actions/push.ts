"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getVapidKeys, sendPush } from "@/lib/push";

export async function getPushPublicKey(): Promise<string> {
  await getCurrentUser();
  return (await getVapidKeys()).publicKey;
}

const SubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** บันทึกการแจ้งเตือนของเครื่องนี้ (endpoint เดิมย้ายมาเป็นของผู้ใช้ที่ล็อกอินอยู่) */
export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลการแจ้งเตือนไม่ถูกต้อง" };
  const { endpoint, keys } = parsed.data;
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id, userAgent },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id, userAgent, lastUsedAt: new Date() },
  });
  return { ok: true, message: "เปิดแจ้งเตือนบนเครื่องนี้แล้ว" };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true, message: "ปิดแจ้งเตือนบนเครื่องนี้แล้ว" };
}

export async function sendTestPush(): Promise<ActionResult> {
  const user = await getCurrentUser();
  const r = await sendPush({ title: "CK CRM", body: "ทดสอบแจ้งเตือน — ถ้าเห็นข้อความนี้แปลว่าใช้งานได้ ✅", url: "/chats", tag: "test" }, { userIds: [user.id] });
  if (r.sent === 0) return { ok: false, error: "ส่งไม่สำเร็จ ลองปิดแล้วเปิดแจ้งเตือนใหม่" };
  return { ok: true, message: `ส่งแจ้งเตือนทดสอบไป ${r.sent} เครื่อง` };
}
