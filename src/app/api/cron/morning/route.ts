import { processDueReminders, sendMorningSummary } from "@/lib/tasks";

/** GET /api/cron/morning — Vercel Cron 08:00 น. (เวลาไทย): สรุปงานวันนี้ให้แต่ละคน */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const [users, reminders] = await Promise.all([sendMorningSummary(), processDueReminders()]);
  return Response.json({ ok: true, users, reminders });
}
