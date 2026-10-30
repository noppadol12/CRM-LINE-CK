"use server";

import { refresh } from "next/cache";
import { getLineClient } from "@/lib/line";
import { retryFailedEvents } from "@/lib/maintenance";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";

function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/401/.test(msg)) return "Channel access token ไม่ถูกต้องหรือหมดอายุ";
  return msg.slice(0, 300);
}

/** ตั้ง Webhook URL ใน LINE ให้ชี้มาที่ระบบนี้ แล้วทดสอบเรียกทันที */
export async function setupLineWebhook(endpoint: string): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const client = getLineClient();
  if (!client) return { ok: false, error: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" };
  if (!/^https:\/\/[^/]+\/api\/line\/webhook$/.test(endpoint)) return { ok: false, error: "Webhook URL ไม่ถูกต้อง" };

  try {
    await client.setWebhookEndpoint({ endpoint });
  } catch (e) {
    return { ok: false, error: `ตั้ง Webhook ไม่สำเร็จ: ${describeError(e)}` };
  }
  refresh();
  return testLineWebhook();
}

export async function testLineWebhook(): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const client = getLineClient();
  if (!client) return { ok: false, error: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" };
  try {
    const r = await client.testWebhookEndpoint();
    if (r.success) return { ok: true, message: "LINE เรียก Webhook สำเร็จ ✓" };
    return { ok: false, error: `LINE เรียก Webhook ไม่สำเร็จ (HTTP ${r.statusCode}) ${r.reason ?? ""} ${r.detail ?? ""}`.trim() };
  } catch (e) {
    return { ok: false, error: `ทดสอบไม่สำเร็จ: ${describeError(e)}` };
  }
}

/** ลองประมวลผล event ที่ผิดพลาดอีกครั้ง */
export async function retryWebhookEvents(): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const r = await retryFailedEvents({ deadline: Date.now() + 40_000, minAgeMs: 0 });
  refresh();
  if (r.found === 0) return { ok: true, message: "ไม่มี event ค้าง" };
  if (r.failed > 0) return { ok: false, error: `สำเร็จ ${r.ok} รายการ ยังผิดพลาด ${r.failed} รายการ` };
  return { ok: true, message: `ประมวลผลใหม่สำเร็จ ${r.ok} รายการ` };
}
