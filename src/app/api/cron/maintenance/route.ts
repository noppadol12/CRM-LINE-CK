import { runMaintenance } from "@/lib/maintenance";

export const maxDuration = 60;

/**
 * GET /api/cron/maintenance — Vercel Cron เรียกวันละครั้ง (ดู vercel.json)
 * ต้องตั้ง CRON_SECRET ใน Environment Variables (Vercel แนบเป็น Authorization: Bearer ให้อัตโนมัติ)
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runMaintenance({ budgetMs: 50_000 });
  return Response.json({ ok: true, ...result });
}
