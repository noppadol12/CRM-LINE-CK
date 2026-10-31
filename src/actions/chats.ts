"use server";

import type { messagingApi } from "@line/bot-sdk";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { publicBaseUrl, signMediaId } from "@/lib/file-response";
import { deleteDriveFile, getDriveSession, monthFolder, uploadToDrive } from "@/lib/google-drive";
import { getLineClient } from "@/lib/line";
import { lineErrorMessage, sendToCustomer, type SendResult } from "@/lib/line-send";
import type { ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const MAX_TEXT = 5000; // ข้อจำกัดของ LINE text message
const MAX_UPLOAD = 4 * 1024 * 1024; // Vercel รับ request ได้ไม่เกิน ~4.5 MB

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "text/plain": "ข้อความ",
  "text/csv": "CSV",
};

type Recipient = { id: string; lineUserId: string; lastReplyToken: string | null; lastReplyTokenAt: Date | null };

async function loadRecipient(customerId: string): Promise<{ customer: Recipient } | { error: string }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, lineUserId: true, followStatus: true, lastReplyToken: true, lastReplyTokenAt: true },
  });
  if (!customer?.lineUserId) return { error: "ลูกค้ารายนี้ไม่มีบัญชี LINE" };
  if (customer.followStatus === "UNFOLLOWED") return { error: "ลูกค้าบล็อก OA แล้ว ส่งข้อความไม่ได้" };
  if (!getLineClient()) return { error: "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" };
  return { customer: { ...customer, lineUserId: customer.lineUserId } };
}

/** หลังส่งสำเร็จ: อัปเดตข้อความล่าสุด + ถือว่าอ่านข้อความลูกค้าแล้ว */
function afterSendOps(customerId: string, preview: string, now: Date) {
  return [
    prisma.customer.update({
      where: { id: customerId },
      data: { lastMessageAt: now, lastMessagePreview: `คุณ: ${preview}`.slice(0, 200), unreadCount: 0, deletedAt: null },
    }),
    prisma.chatMessage.updateMany({
      where: { customerId, direction: "INBOUND", readAt: null },
      data: { readAt: now },
    }),
  ];
}

const freeNote = (via: "reply" | "push") => (via === "reply" ? "ส่งแล้ว · ตอบฟรี ไม่นับโควตา" : undefined);

/** ส่งข้อความหาลูกค้า (Reply ฟรีถ้าตอบทัน ไม่งั้น Push) แล้วบันทึกลงประวัติแชท */
export async function sendChatMessage(customerId: string, rawText: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const text = rawText.trim();
  if (!text) return { ok: false, error: "พิมพ์ข้อความก่อนส่ง" };
  if (text.length > MAX_TEXT) return { ok: false, error: `ข้อความยาวเกิน ${MAX_TEXT.toLocaleString()} ตัวอักษร` };

  const r = await loadRecipient(customerId);
  if ("error" in r) return { ok: false, error: r.error };

  let sent: SendResult;
  try {
    sent = await sendToCustomer(r.customer, [{ type: "text", text }]);
  } catch (e) {
    console.error("[chat] send failed", e);
    return { ok: false, error: lineErrorMessage(e) };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        customerId,
        direction: "OUTBOUND",
        type: "TEXT",
        text,
        lineMessageId: sent.messageIds[0] ?? null,
        sentVia: sent.via,
        sentById: user.id,
        sentAt: now,
      },
    }),
    ...afterSendOps(customerId, text, now),
  ]);

  refresh();
  return { ok: true, message: freeNote(sent.via) };
}

function fileSizeText(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** การ์ดไฟล์ใน LINE (LINE ไม่มีข้อความชนิดไฟล์สำหรับส่งออก จึงส่งเป็นการ์ดพร้อมปุ่มเปิดลิงก์) */
function fileCard(name: string, kind: string, size: number, url: string): messagingApi.FlexMessage {
  return {
    type: "flex",
    altText: `📄 ${name}`.slice(0, 400),
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: `📄 ไฟล์ ${kind}`, size: "xs", color: "#888888" },
          { type: "text", text: name, weight: "bold", size: "sm", wrap: true, maxLines: 3 },
          { type: "text", text: fileSizeText(size), size: "xs", color: "#888888" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "button", style: "primary", color: "#00a24f", height: "sm", action: { type: "uri", label: "เปิดไฟล์", uri: url } }],
      },
    },
  };
}

/** ส่งรูป/ไฟล์ให้ลูกค้า: เก็บใน Google Drive → ส่งลิงก์ที่มีลายเซ็นให้ LINE ดึงไฟล์ */
export async function sendChatAttachment(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const customerId = String(formData.get("customerId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "ไม่พบไฟล์" };
  if (file.size > MAX_UPLOAD) return { ok: false, error: "ไฟล์ใหญ่เกิน 4 MB" };

  const mime = file.type || "application/octet-stream";
  const isImage = IMAGE_TYPES.includes(mime);
  const kind = FILE_TYPES[mime];
  if (!isImage && !kind) return { ok: false, error: "รองรับรูป JPG/PNG และไฟล์ PDF, Word, Excel, PowerPoint, ZIP, TXT, CSV" };
  const fileName = (file.name || (isImage ? "image.jpg" : "file")).slice(0, 150);

  const r = await loadRecipient(customerId);
  if ("error" in r) return { ok: false, error: r.error };

  const drive = await getDriveSession().catch(() => null);
  if (!drive) return { ok: false, error: "ต้องเชื่อมต่อ Google Drive ก่อน (ใช้เก็บไฟล์ที่ส่งให้ลูกค้า) — ตั้งค่า → ที่เก็บไฟล์" };

  const data = new Uint8Array(await file.arrayBuffer());
  const now = new Date();
  let uploaded: { id: string };
  try {
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(now);
    const folderId = await monthFolder(drive, month);
    uploaded = await uploadToDrive(drive.token, {
      name: `ส่งให้ลูกค้า_${now.toISOString().slice(0, 10)}_${fileName}`,
      mime,
      data,
      folderId,
      description: `ส่งโดย ${user.name}`,
    });
  } catch (e) {
    console.error("[chat] drive upload failed", e);
    return { ok: false, error: "อัปโหลดไฟล์ไป Google Drive ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  const msg = await prisma.chatMessage.create({
    data: {
      customerId,
      direction: "OUTBOUND",
      type: isImage ? "IMAGE" : "FILE",
      text: isImage ? null : fileName,
      driveFileId: uploaded.id,
      mediaMime: mime,
      mediaSize: data.byteLength,
      mediaSavedAt: now,
      sentById: user.id,
      sentAt: now,
    },
    select: { id: true },
  });

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const url = `${publicBaseUrl(origin)}/api/media/${msg.id}/${signMediaId(msg.id)}`;
  const message: messagingApi.Message = isImage
    ? { type: "image", originalContentUrl: url, previewImageUrl: url }
    : fileCard(fileName, kind, data.byteLength, url);

  let sent: SendResult;
  try {
    sent = await sendToCustomer(r.customer, [message]);
  } catch (e) {
    console.error("[chat] send attachment failed", e);
    await prisma.chatMessage.delete({ where: { id: msg.id } }).catch(() => undefined);
    await deleteDriveFile(drive.token, uploaded.id).catch(() => undefined);
    return { ok: false, error: lineErrorMessage(e) };
  }

  const preview = isImage ? "[รูปภาพ]" : `[ไฟล์] ${fileName}`;
  await prisma.$transaction([
    prisma.chatMessage.update({ where: { id: msg.id }, data: { lineMessageId: sent.messageIds[0] ?? null, sentVia: sent.via } }),
    ...afterSendOps(customerId, preview, now),
  ]);
  refresh();
  return { ok: true, message: freeNote(sent.via) ?? "ส่งแล้ว" };
}

/** เปิดอ่านห้องแชท → ล้างจำนวนรอตอบ */
export async function markConversationRead(customerId: string): Promise<ActionResult> {
  await getCurrentUser();
  const now = new Date();
  const res = await prisma.customer.updateMany({ where: { id: customerId, unreadCount: { gt: 0 } }, data: { unreadCount: 0 } });
  if (res.count > 0) {
    await prisma.chatMessage.updateMany({ where: { customerId, direction: "INBOUND", readAt: null }, data: { readAt: now } });
    refresh();
  }
  return { ok: true };
}

/** ทำเครื่องหมายว่ายังไม่อ่าน (ไว้กลับมาตอบทีหลัง) */
export async function markConversationUnread(customerId: string): Promise<ActionResult> {
  await getCurrentUser();
  await prisma.customer.update({ where: { id: customerId }, data: { unreadCount: { increment: 1 } } });
  refresh();
  return { ok: true };
}
