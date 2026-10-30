import { after } from "next/server";
import { validateSignature, type webhook } from "@line/bot-sdk";
import { Prisma } from "@/generated/prisma/client";
import { getChannelSecret } from "@/lib/line";
import { processLineEvent } from "@/lib/line-events";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/line/webhook — รับ event จาก LINE Messaging API
 *
 * 1. ตรวจลายเซ็น x-line-signature (กันคนปลอม request)
 * 2. บันทึก event ดิบลง webhook_events ทันที (id = webhookEventId กันประมวลผลซ้ำเมื่อ LINE ส่งซ้ำ)
 * 3. ตอบ 200 ให้ LINE เร็วที่สุด แล้วค่อยประมวลผลต่อด้วย after()
 */
export async function POST(request: Request) {
  const secret = getChannelSecret();
  if (!secret) {
    console.error("[webhook] LINE_CHANNEL_SECRET is not set");
    return Response.json({ error: "LINE_CHANNEL_SECRET is not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";
  if (!signature || !validateSignature(body, secret, signature)) {
    console.warn("[webhook] invalid signature");
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: webhook.CallbackRequest;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  // ปุ่ม "Verify" ใน LINE Console ส่ง events ว่างมา
  const events = payload.events ?? [];
  if (events.length === 0) return Response.json({ ok: true });

  const fresh: webhook.Event[] = [];
  for (const event of events) {
    const id = event.webhookEventId;
    const lineUserId = event.source?.type === "user" ? ((event.source as webhook.UserSource).userId ?? null) : null;
    try {
      await prisma.webhookEvent.create({
        data: { id, type: event.type, lineUserId, payload: event as unknown as Prisma.InputJsonValue },
      });
      fresh.push(event);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // ได้รับแล้ว
      console.error("[webhook] cannot store event", e);
      // ตอบ 500 ให้ LINE ส่งซ้ำภายหลัง (ถ้าเปิด Webhook redelivery ไว้)
      return Response.json({ error: "storage error" }, { status: 500 });
    }
  }

  after(async () => {
    // เรียงตามเวลา เพื่อให้ follow มาก่อน message เมื่อมาพร้อมกัน
    for (const event of fresh.sort((a, b) => a.timestamp - b.timestamp)) {
      try {
        const result = await processLineEvent(event);
        await prisma.webhookEvent.update({
          where: { id: event.webhookEventId },
          data: { processedAt: new Date(), error: result.startsWith("skip") ? result : null },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`[webhook] process ${event.webhookEventId} failed`, e);
        await prisma.webhookEvent
          .update({ where: { id: event.webhookEventId }, data: { error: message.slice(0, 1000) } })
          .catch(() => undefined);
      }
    }
  });

  return Response.json({ ok: true, received: events.length, new: fresh.length });
}
