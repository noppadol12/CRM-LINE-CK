import { processDueReminders } from "@/lib/tasks";

/**
 * GET /api/cron/reminders — ส่งแจ้งเตือนงานที่ถึงเวลา
 * ไม่บังคับ: ตั้งบริการ cron ภายนอก (เช่น cron-job.org) เรียกทุก 5 นาที พร้อม header
 * Authorization: Bearer <CRON_SECRET> เพื่อให้เตือนตรงเวลาแม้ไม่มีใครเปิดเว็บ
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ ok: true, sent: await processDueReminders() });
}
