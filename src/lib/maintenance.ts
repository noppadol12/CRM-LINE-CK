import "server-only";
import type { webhook } from "@line/bot-sdk";
import { processLineEvent } from "@/lib/line-events";
import { savePendingMedia } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/settings";
import { maybeProcessReminders, processDueReminders } from "@/lib/tasks";

const MAX_EVENT_ATTEMPTS = 5;

/** ประมวลผล event ที่บันทึกไว้แล้วหนึ่งรายการ และบันทึกผลลงตาราง webhook_events */
export async function processStoredEvent(event: webhook.Event, { retry = false } = {}) {
  try {
    const result = await processLineEvent(event);
    await prisma.webhookEvent.update({
      where: { id: event.webhookEventId },
      data: { processedAt: new Date(), error: result.startsWith("skip") ? result : null, ...(retry ? { attempts: { increment: 1 } } : {}) },
    });
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[webhook] process ${event.webhookEventId} failed`, e);
    await prisma.webhookEvent
      .update({
        where: { id: event.webhookEventId },
        data: { error: message.slice(0, 1000), ...(retry ? { attempts: { increment: 1 } } : {}) },
      })
      .catch(() => undefined);
    return false;
  }
}

/** ลองประมวลผล event ที่ค้าง/ผิดพลาดอีกครั้ง (เช่น ฐานข้อมูลสะดุดชั่วคราว) */
export async function retryFailedEvents({ deadline, minAgeMs = 2 * 60_000 }: { deadline: number; minAgeMs?: number }) {
  const rows = await prisma.webhookEvent.findMany({
    where: {
      processedAt: null,
      attempts: { lt: MAX_EVENT_ATTEMPTS },
      receivedAt: { lte: new Date(Date.now() - minAgeMs), gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { receivedAt: "asc" },
    take: 100,
    select: { payload: true },
  });
  let ok = 0;
  let failed = 0;
  for (const r of rows) {
    if (Date.now() > deadline) break;
    if (await processStoredEvent(r.payload as unknown as webhook.Event, { retry: true })) ok++;
    else failed++;
  }
  return { ok, failed, found: rows.length };
}

/** งานดูแลระบบ: event ค้าง → ไฟล์ค้าง → ล้างข้อมูลเก่า */
export async function runMaintenance({ budgetMs }: { budgetMs: number }) {
  const deadline = Date.now() + budgetMs;
  const reminders = await processDueReminders().catch(() => 0);
  const events = await retryFailedEvents({ deadline });
  const media = await savePendingMedia({ deadline });
  const [attempts, oldEvents] = await Promise.all([
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.webhookEvent.deleteMany({
      where: { processedAt: { not: null }, receivedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    }),
  ]);
  return { reminders, events, media, cleaned: { loginAttempts: attempts.count, webhookEvents: oldEvents.count } };
}

const THROTTLE_KEY = "maintenance";
const THROTTLE_MS = 15 * 60_000;

/** เรียกจาก webhook: รันงานดูแลระบบไม่เกินทุก 15 นาที (ไม่ต้องตั้ง cron เพิ่ม) */
export async function maybeRunMaintenance() {
  try {
    await maybeProcessReminders();
    const last = await getSetting<{ lastRunAt: string }>(THROTTLE_KEY);
    if (last && Date.now() - new Date(last.lastRunAt).getTime() < THROTTLE_MS) return;
    await setSetting(THROTTLE_KEY, { lastRunAt: new Date().toISOString() });
    await runMaintenance({ budgetMs: 20_000 });
  } catch (e) {
    console.error("[maintenance] failed", e);
  }
}
