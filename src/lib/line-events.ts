import "server-only";
import type { webhook } from "@line/bot-sdk";
import { Prisma } from "@/generated/prisma/client";
import type { MessageType } from "@/generated/prisma/client";
import { fetchLineProfile } from "@/lib/line";
import { prisma } from "@/lib/prisma";

const PROFILE_REFRESH_MS = 24 * 60 * 60 * 1000; // อัปเดตชื่อ/รูปจาก LINE วันละครั้งพอ

/** แปลงข้อความ LINE → ชนิด + ข้อความที่แสดงในระบบ */
export function describeMessage(m: webhook.MessageContent): { type: MessageType; text: string | null; preview: string } {
  switch (m.type) {
    case "text":
      return { type: "TEXT", text: m.text, preview: m.text };
    case "image":
      return { type: "IMAGE", text: null, preview: "[รูปภาพ]" };
    case "video":
      return { type: "VIDEO", text: null, preview: "[วิดีโอ]" };
    case "audio":
      return { type: "AUDIO", text: null, preview: "[ข้อความเสียง]" };
    case "file": {
      const name = (m as webhook.FileMessageContent).fileName;
      return { type: "FILE", text: name ?? null, preview: `[ไฟล์] ${name ?? ""}`.trim() };
    }
    case "sticker":
      return { type: "STICKER", text: null, preview: "[สติกเกอร์]" };
    case "location": {
      const loc = m as webhook.LocationMessageContent;
      const text = [loc.title, loc.address].filter(Boolean).join("\n") || null;
      return { type: "LOCATION", text, preview: `[ตำแหน่ง] ${loc.title ?? loc.address ?? ""}`.trim() };
    }
    default:
      return { type: "OTHER", text: null, preview: `[${(m as { type: string }).type}]` };
  }
}

/** หา/สร้างลูกค้าจาก LINE UID และอัปเดตโปรไฟล์ถ้าเก่าเกิน 1 วัน */
async function ensureCustomer(lineUserId: string, opts: { follow?: boolean } = {}) {
  const existing = await prisma.customer.findUnique({
    where: { lineUserId },
    select: { id: true, lineName: true, profileSyncedAt: true, followStatus: true, deletedAt: true },
  });

  const needProfile =
    !existing ||
    !existing.lineName ||
    opts.follow ||
    !existing.profileSyncedAt ||
    Date.now() - existing.profileSyncedAt.getTime() > PROFILE_REFRESH_MS;
  const profile = needProfile ? await fetchLineProfile(lineUserId) : null;
  const profileData = profile
    ? {
        lineName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
        profileSyncedAt: new Date(),
      }
    : {};

  if (!existing) {
    try {
      return await prisma.customer.create({
        data: { lineUserId, followStatus: "FOLLOWING", followedAt: new Date(), ...profileData },
        select: { id: true },
      });
    } catch (e) {
      // อีก request สร้างไปพร้อมกัน → ใช้ของที่มีอยู่
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return prisma.customer.findUniqueOrThrow({ where: { lineUserId }, select: { id: true } });
      }
      throw e;
    }
  }

  // ลูกค้าทักมา = ยังเป็นเพื่อน; ถ้าเคยถูกลบในระบบ ให้กลับมาแสดงอีกครั้ง
  const data: Prisma.CustomerUpdateInput = { ...profileData };
  if (existing.followStatus !== "FOLLOWING") {
    data.followStatus = "FOLLOWING";
    data.followedAt = opts.follow ? new Date() : undefined;
  }
  if (existing.deletedAt) data.deletedAt = null;
  if (Object.keys(data).length > 0) {
    await prisma.customer.update({ where: { id: existing.id }, data });
  }
  return { id: existing.id };
}

function userIdOf(event: webhook.Event): string | null {
  const src = event.source;
  return src && src.type === "user" ? ((src as webhook.UserSource).userId ?? null) : null;
}

/** ประมวลผล event หนึ่งรายการ — ต้องรันซ้ำได้ปลอดภัย (LINE อาจส่งซ้ำ) */
export async function processLineEvent(event: webhook.Event): Promise<string> {
  const userId = userIdOf(event);
  if (!userId) return "skip: ไม่ใช่แชท 1:1 (กลุ่ม/ห้อง)";

  switch (event.type) {
    case "follow": {
      await ensureCustomer(userId, { follow: true });
      return "follow";
    }

    case "unfollow": {
      await prisma.customer.updateMany({
        where: { lineUserId: userId },
        data: { followStatus: "UNFOLLOWED", unfollowedAt: new Date(event.timestamp) },
      });
      return "unfollow";
    }

    case "message": {
      const e = event as webhook.MessageEvent;
      const customer = await ensureCustomer(userId);
      const { type, text, preview } = describeMessage(e.message);
      const sentAt = new Date(e.timestamp);

      try {
        await prisma.chatMessage.create({
          data: {
            customerId: customer.id,
            direction: "INBOUND",
            type,
            text,
            payload: e.message as unknown as Prisma.InputJsonValue,
            lineMessageId: e.message.id,
            sentAt,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "duplicate message";
        throw err;
      }

      await prisma.customer.update({ where: { id: customer.id }, data: { unreadCount: { increment: 1 } } });
      // อัปเดต "ข้อความล่าสุด" เฉพาะเมื่อข้อความนี้ใหม่กว่า (LINE อาจส่ง event ไม่เรียงลำดับ)
      await prisma.customer.updateMany({
        where: { id: customer.id, OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: sentAt } }] },
        data: { lastMessageAt: sentAt, lastMessagePreview: preview.slice(0, 200) },
      });
      return `message:${type}`;
    }

    default:
      return `skip: ${event.type}`;
  }
}
