import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/line/content/:messageId — ส่งต่อรูป/วิดีโอ/เสียง/ไฟล์ที่ลูกค้าส่งมาทาง LINE
 * ต้องล็อกอิน (ไฟล์เป็นข้อมูลลูกค้า) และ LINE เก็บไฟล์ไว้ชั่วระยะหนึ่งเท่านั้น
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/line/content/[messageId]">) {
  const session = await getSession().catch(() => null);
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });

  const { messageId } = await ctx.params;
  if (!/^\d{1,30}$/.test(messageId)) return new Response("Bad request", { status: 400 });

  // ต้องเป็นข้อความที่อยู่ในระบบเท่านั้น
  const exists = await prisma.chatMessage.findUnique({ where: { lineMessageId: messageId }, select: { id: true } });
  if (!exists) return new Response("Not found", { status: 404 });

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return new Response("LINE not configured", { status: 503 });

  const base = process.env.LINE_DATA_API_BASE ?? "https://api-data.line.me";
  const res = await fetch(`${base}/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok || !res.body) {
    return new Response(res.status === 404 ? "ไฟล์หมดอายุใน LINE แล้ว" : "Upstream error", {
      status: res.status === 404 ? 410 : 502,
    });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      ...(res.headers.get("content-length") ? { "Content-Length": res.headers.get("content-length")! } : {}),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
