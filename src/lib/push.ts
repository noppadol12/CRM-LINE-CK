import "server-only";
import webpush from "web-push";
import { Prisma } from "@/generated/prisma/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

/**
 * Web Push (แจ้งเตือนบนมือถือ/คอม) — กุญแจ VAPID สร้างให้อัตโนมัติครั้งแรก เก็บใน app_settings
 * (กุญแจลับเข้ารหัสก่อนเก็บ) จึงไม่ต้องตั้ง Environment Variables เพิ่ม
 */
const KEY = "vapid";
type StoredVapid = { publicKey: string; privateKey: string };

let cached: { publicKey: string; privateKey: string } | null = null;

export async function getVapidKeys() {
  if (cached) return cached;
  let stored = await getSetting<StoredVapid>(KEY);
  if (!stored) {
    const keys = webpush.generateVAPIDKeys();
    try {
      await prisma.appSetting.create({
        data: { key: KEY, value: { publicKey: keys.publicKey, privateKey: encryptSecret(keys.privateKey) } },
      });
    } catch (e) {
      // อีก request สร้างไปพร้อมกัน → ใช้ของที่บันทึกก่อน
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
    stored = await getSetting<StoredVapid>(KEY);
  }
  if (!stored) throw new Error("สร้างกุญแจแจ้งเตือนไม่สำเร็จ");
  cached = { publicKey: stored.publicKey, privateKey: decryptSecret(stored.privateKey) };
  return cached;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** ส่งแจ้งเตือนถึงผู้ใช้ที่ระบุ (หรือทุกคนที่ใช้งานอยู่) — ไม่ throw */
export async function sendPush(payload: PushPayload, opts: { userIds?: string[] } = {}) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { user: { isActive: true }, ...(opts.userIds ? { userId: { in: opts.userIds } } : {}) },
    });
    if (subs.length === 0) return { sent: 0, removed: 0 };

    const vapid = await getVapidKeys();
    const subject = `mailto:${process.env.ADMIN_EMAIL?.trim() || "admin@example.com"}`;
    const body = JSON.stringify(payload);
    let sent = 0;
    const dead: string[] = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            vapidDetails: { subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
            TTL: 60 * 60,
            urgency: "high",
            topic: payload.tag?.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, ""),
            timeout: 8000,
          });
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410 = ผู้ใช้ยกเลิกแจ้งเตือน หรือถอนการติดตั้งแอปแล้ว
          if (status === 404 || status === 410) dead.push(s.id);
          else console.warn("[push] send failed", status, (e as Error).message);
        }
      }),
    );
    if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    if (sent) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: subs.filter((s) => !dead.includes(s.id)).map((s) => s.id) } },
        data: { lastUsedAt: new Date() },
      });
    }
    return { sent, removed: dead.length };
  } catch (e) {
    console.error("[push] failed", e);
    return { sent: 0, removed: 0 };
  }
}
