import { after } from "next/server";
import { getApiUser } from "@/lib/auth";
import { downloadFromDrive, getDriveSession } from "@/lib/google-drive";
import { lineContentUrl, saveMessageMedia } from "@/lib/media";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/line/content/:messageId — รูป/วิดีโอ/เสียง/ไฟล์ที่ลูกค้าส่งมาทาง LINE (ต้องล็อกอิน)
 * 1. มีสำเนาใน Google Drive → ส่งจาก Drive (เก็บถาวร)
 * 2. ไม่มี → ดึงจาก LINE (เก็บชั่วคราว) แล้วสั่งคัดลอกไป Drive เบื้องหลัง
 */
export async function GET(request: Request, ctx: RouteContext<"/api/line/content/[messageId]">) {
  const user = await getApiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messageId } = await ctx.params;
  if (!/^\d{1,30}$/.test(messageId)) return new Response("Bad request", { status: 400 });

  const msg = await prisma.chatMessage.findUnique({
    where: { lineMessageId: messageId },
    select: { id: true, type: true, text: true, driveFileId: true, mediaMime: true },
  });
  if (!msg) return new Response("Not found", { status: 404 });

  const fileName = msg.type === "FILE" && msg.text ? msg.text : null;
  const range = request.headers.get("range");

  if (msg.driveFileId) {
    try {
      const drive = await getDriveSession();
      if (drive) {
        const res = await downloadFromDrive(drive.token, msg.driveFileId, range);
        if ((res.ok || res.status === 206) && res.body) return passThrough(res, msg.mediaMime, fileName);
        console.warn(`[content] drive ${res.status} for ${msg.id}`);
      }
    } catch (e) {
      console.error("[content] drive error", e);
    }
    // Drive ใช้ไม่ได้ชั่วคราว → ลองจาก LINE ต่อ
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return new Response("LINE not configured", { status: 503 });

  const res = await fetch(lineContentUrl(messageId), {
    headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
  });
  if (res.status === 202) return new Response("LINE กำลังเตรียมไฟล์ ลองใหม่อีกครู่", { status: 503, headers: { "Retry-After": "5" } });
  if ((!res.ok && res.status !== 206) || !res.body) {
    return new Response(res.status === 404 ? "ไฟล์หมดอายุใน LINE แล้ว" : "Upstream error", {
      status: res.status === 404 ? 410 : 502,
    });
  }

  if (!msg.driveFileId) after(() => saveMessageMedia(msg.id));
  return passThrough(res, null, fileName);
}

// เปิดดูในเบราว์เซอร์ได้เฉพาะชนิดที่ปลอดภัย ที่เหลือ (เช่น .html/.svg ที่ลูกค้าส่งมา) บังคับดาวน์โหลด กันสคริปต์รันบนโดเมนเรา
const SAFE_INLINE = /^(image\/(jpeg|png|gif|webp)|video\/|audio\/|application\/pdf$)/;

function passThrough(res: Response, mime: string | null, fileName: string | null) {
  const type = (res.headers.get("content-type") ?? mime ?? "application/octet-stream").split(";")[0].trim();
  const inline = SAFE_INLINE.test(type);
  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  });
  if (type !== "application/pdf") headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
  for (const h of ["content-length", "content-range", "accept-ranges"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  const disposition = inline ? "inline" : "attachment";
  headers.set("Content-Disposition", fileName ? `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}` : disposition);
  return new Response(res.body, { status: res.status, headers });
}
