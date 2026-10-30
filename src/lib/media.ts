import "server-only";
import type { MessageType } from "@/generated/prisma/client";
import { displayName } from "@/lib/format";
import { DriveAuthError, getDriveSession, monthFolder, uploadToDrive } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

/** ชนิดข้อความที่มีไฟล์ต้องเก็บ */
export const MEDIA_TYPES: MessageType[] = ["IMAGE", "VIDEO", "AUDIO", "FILE"];
export const MAX_MEDIA_ATTEMPTS = 6;
/** LINE เก็บไฟล์ไว้ชั่วคราว (ไม่ระบุระยะเวลาแน่นอน) — เกินนี้ถือว่าหมดอายุ */
const LINE_RETENTION_DAYS = 30;

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "application/pdf": ".pdf",
};

const stamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function bangkokParts(d: Date) {
  const p = Object.fromEntries(stamp.formatToParts(d).map((x) => [x.type, x.value]));
  return { month: `${p.year}-${p.month}`, file: `${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}` };
}

function safe(s: string) {
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "ลูกค้า";
}

export function lineContentUrl(lineMessageId: string) {
  return `${process.env.LINE_DATA_API_BASE ?? "https://api-data.line.me"}/v2/bot/message/${lineMessageId}/content`;
}

type SaveResult = "saved" | "already" | "not-connected" | "pending" | "expired" | "failed" | "busy" | "skip";

/**
 * คัดลอกไฟล์ของข้อความหนึ่งจาก LINE ไปเก็บใน Google Drive
 * - เรียกซ้ำได้ปลอดภัย: "จอง" ข้อความด้วยการเพิ่ม mediaAttempts แบบมีเงื่อนไข กันอัปโหลดซ้ำ 2 ไฟล์
 * - ไม่ throw (ใช้ใน webhook / งานเบื้องหลัง)
 */
export async function saveMessageMedia(messageId: string): Promise<SaveResult> {
  const msg = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      type: true,
      text: true,
      payload: true,
      lineMessageId: true,
      driveFileId: true,
      mediaAttempts: true,
      sentAt: true,
      customer: { select: { fullName: true, lineName: true, lineUserId: true } },
    },
  });
  if (!msg || !msg.lineMessageId || !MEDIA_TYPES.includes(msg.type)) return "skip";
  if (msg.driveFileId) return "already";
  if (msg.mediaAttempts >= MAX_MEDIA_ATTEMPTS) return "failed";

  const provider = (msg.payload as { contentProvider?: { type?: string } } | null)?.contentProvider?.type;
  if (provider && provider !== "line") {
    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { mediaAttempts: MAX_MEDIA_ATTEMPTS, mediaError: "ไฟล์อยู่บนเว็บภายนอก ไม่ได้เก็บใน LINE" },
    });
    return "skip";
  }

  let session;
  try {
    session = await getDriveSession();
  } catch (e) {
    console.error("[media] drive auth", e);
    return "not-connected";
  }
  if (!session) return "not-connected";

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return "not-connected";

  // จองงาน (กันสอง request อัปโหลดไฟล์เดียวกันพร้อมกัน)
  const claimed = await prisma.chatMessage.updateMany({
    where: { id: msg.id, driveFileId: null, mediaAttempts: msg.mediaAttempts },
    data: { mediaAttempts: { increment: 1 } },
  });
  if (claimed.count === 0) return "busy";

  const fail = async (error: string, opts: { final?: boolean; refund?: boolean } = {}) => {
    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: {
        mediaError: error.slice(0, 500),
        ...(opts.final ? { mediaAttempts: MAX_MEDIA_ATTEMPTS } : {}),
        ...(opts.refund ? { mediaAttempts: { decrement: 1 } } : {}),
      },
    });
  };

  try {
    const res = await fetch(lineContentUrl(msg.lineMessageId), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 202) {
      // วิดีโอ/เสียงยังแปลงไฟล์ไม่เสร็จ → ลองใหม่รอบหน้า
      await fail("LINE กำลังเตรียมไฟล์ จะลองใหม่ภายหลัง");
      return "pending";
    }
    if (res.status === 404 || res.status === 410) {
      await fail("ไฟล์หมดอายุใน LINE แล้ว", { final: true });
      return "expired";
    }
    if (!res.ok) {
      await fail(`ดึงไฟล์จาก LINE ไม่สำเร็จ (${res.status})`);
      return "failed";
    }

    const mime = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0].trim();
    const data = new Uint8Array(await res.arrayBuffer());
    const when = bangkokParts(msg.sentAt);
    const fileName = msg.type === "FILE" && msg.text ? msg.text : null;
    const ext = fileName ? "" : (EXT[mime] ?? "");
    const name = `${when.file}_${safe(displayName(msg.customer))}_${fileName ? safe(fileName) : msg.lineMessageId}${ext}`;

    const folderId = await monthFolder(session, when.month);
    const uploaded = await uploadToDrive(session.token, {
      name,
      mime,
      data,
      folderId,
      description: `LINE message ${msg.lineMessageId} · ${displayName(msg.customer)}`,
    });

    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { driveFileId: uploaded.id, mediaMime: mime, mediaSize: data.byteLength, mediaSavedAt: new Date(), mediaError: null },
    });
    return "saved";
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[media] save ${msg.id} failed`, e);
    // Drive ใช้ไม่ได้ (ต้องเชื่อมต่อใหม่) ไม่ใช่ความผิดของไฟล์ → คืนโควตาการลอง
    await fail(message, { refund: e instanceof DriveAuthError }).catch(() => undefined);
    return e instanceof DriveAuthError ? "not-connected" : "failed";
  }
}

function pendingWhere() {
  return {
    direction: "INBOUND" as const,
    type: { in: MEDIA_TYPES },
    driveFileId: null,
    lineMessageId: { not: null },
    mediaAttempts: { lt: MAX_MEDIA_ATTEMPTS },
    sentAt: { gte: new Date(Date.now() - LINE_RETENTION_DAYS * 24 * 60 * 60 * 1000) },
  };
}

/** บันทึกไฟล์ที่ยังค้างลง Drive ทีละไฟล์จนหมดเวลาที่กำหนด */
export async function savePendingMedia({ deadline, limit = 200 }: { deadline: number; limit?: number }) {
  const rows = await prisma.chatMessage.findMany({
    where: pendingWhere(),
    orderBy: { sentAt: "desc" }, // ไฟล์ใหม่ก่อน (ไฟล์เก่าเสี่ยงหมดอายุแล้ว)
    take: limit,
    select: { id: true },
  });
  const counts: Partial<Record<SaveResult, number>> = {};
  let remaining = rows.length;
  for (const r of rows) {
    if (Date.now() > deadline) break;
    const result = await saveMessageMedia(r.id);
    counts[result] = (counts[result] ?? 0) + 1;
    remaining--;
    if (result === "not-connected") break;
  }
  return { counts, remaining };
}

export async function mediaStats() {
  const [saved, pending, failed, bytes] = await Promise.all([
    prisma.chatMessage.count({ where: { driveFileId: { not: null } } }),
    prisma.chatMessage.count({ where: pendingWhere() }),
    prisma.chatMessage.count({
      where: { type: { in: MEDIA_TYPES }, direction: "INBOUND", driveFileId: null, mediaAttempts: { gte: MAX_MEDIA_ATTEMPTS } },
    }),
    prisma.chatMessage.aggregate({ _sum: { mediaSize: true }, where: { driveFileId: { not: null } } }),
  ]);
  return { saved, pending, failed, bytes: bytes._sum.mediaSize ?? 0 };
}
