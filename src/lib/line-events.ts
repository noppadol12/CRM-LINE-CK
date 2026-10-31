import "server-only";
import type { webhook } from "@line/bot-sdk";
import { Prisma } from "@/generated/prisma/client";
import type { MessageType } from "@/generated/prisma/client";
import { fetchGroupSummary, fetchLineProfile, fetchMemberProfile } from "@/lib/line";
import { MEDIA_TYPES, saveMessageMedia } from "@/lib/media";
import { displayName } from "@/lib/format";
import { sendPush } from "@/lib/push";
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

type ChatSource = { chatType: "user" | "group" | "room"; chatId: string; senderId: string | null };

/** แชทนี้มาจากไหน: 1:1 (user) / กลุ่ม (group) / แชทหลายคน (room) */
function sourceOf(event: webhook.Event): ChatSource | null {
  const src = event.source;
  if (!src) return null;
  if (src.type === "user") {
    const id = (src as webhook.UserSource).userId;
    return id ? { chatType: "user", chatId: id, senderId: id } : null;
  }
  if (src.type === "group") {
    const g = src as webhook.GroupSource;
    return { chatType: "group", chatId: g.groupId, senderId: g.userId ?? null };
  }
  if (src.type === "room") {
    const r = src as webhook.RoomSource;
    return { chatType: "room", chatId: r.roomId, senderId: r.userId ?? null };
  }
  return null;
}

/** หา/สร้างห้องแชทกลุ่ม (เก็บในตาราง customers เหมือนลูกค้า เพื่อให้ใช้ inbox/ดีล/โน้ตร่วมกันได้) */
async function ensureGroupChat(src: ChatSource) {
  const existing = await prisma.customer.findUnique({
    where: { lineUserId: src.chatId },
    select: { id: true, lineName: true, profileSyncedAt: true, followStatus: true, deletedAt: true },
  });
  const stale = !existing?.profileSyncedAt || Date.now() - existing.profileSyncedAt.getTime() > PROFILE_REFRESH_MS || !existing.lineName;
  const summary = src.chatType === "group" && stale ? await fetchGroupSummary(src.chatId) : null;
  const profile = summary ? { lineName: summary.name, pictureUrl: summary.pictureUrl, profileSyncedAt: new Date() } : {};

  if (!existing) {
    try {
      return await prisma.customer.create({
        data: { lineUserId: src.chatId, chatType: src.chatType, followStatus: "FOLLOWING", followedAt: new Date(), ...profile },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return prisma.customer.findUniqueOrThrow({ where: { lineUserId: src.chatId }, select: { id: true } });
      }
      throw e;
    }
  }
  const data: Prisma.CustomerUpdateInput = { ...profile };
  if (existing.followStatus !== "FOLLOWING") data.followStatus = "FOLLOWING";
  if (existing.deletedAt) data.deletedAt = null;
  if (Object.keys(data).length > 0) await prisma.customer.update({ where: { id: existing.id }, data });
  return { id: existing.id };
}

function ensureConversation(src: ChatSource, opts: { follow?: boolean } = {}) {
  return src.chatType === "user" ? ensureCustomer(src.chatId, opts) : ensureGroupChat(src);
}

/** ชื่อ/รูปคนส่งในกลุ่ม — ใช้ชื่อที่เคยเก็บไว้ภายใน 1 วัน ไม่ต้องถาม LINE ทุกข้อความ */
async function resolveSender(conversationId: string, src: ChatSource) {
  if (src.chatType === "user" || !src.senderId) return null;
  const known = await prisma.chatMessage.findFirst({
    where: {
      customerId: conversationId,
      senderLineId: src.senderId,
      senderName: { not: null },
      sentAt: { gte: new Date(Date.now() - PROFILE_REFRESH_MS) },
    },
    orderBy: { sentAt: "desc" },
    select: { senderName: true, senderPictureUrl: true },
  });
  if (known?.senderName) return { name: known.senderName, pictureUrl: known.senderPictureUrl };
  const p = await fetchMemberProfile(src.chatType, src.chatId, src.senderId);
  return p ? { name: p.displayName, pictureUrl: p.pictureUrl } : null;
}

/** ประมวลผล event หนึ่งรายการ — ต้องรันซ้ำได้ปลอดภัย (LINE อาจส่งซ้ำ) */
export async function processLineEvent(event: webhook.Event): Promise<string> {
  const src = sourceOf(event);
  if (!src) return "skip: ไม่ทราบแหล่งที่มา";

  switch (event.type) {
    case "follow": {
      if (src.chatType !== "user") return "skip: follow";
      await ensureCustomer(src.chatId, { follow: true });
      return "follow";
    }

    case "unfollow": {
      if (src.chatType !== "user") return "skip: unfollow";
      await prisma.customer.updateMany({
        where: { lineUserId: src.chatId },
        data: { followStatus: "UNFOLLOWED", unfollowedAt: new Date(event.timestamp) },
      });
      return "unfollow";
    }

    // OA ถูกเชิญเข้ากลุ่ม / ถูกนำออกจากกลุ่ม
    case "join": {
      await ensureConversation(src);
      return `join:${src.chatType}`;
    }

    case "leave": {
      await prisma.customer.updateMany({
        where: { lineUserId: src.chatId },
        data: { followStatus: "UNFOLLOWED", unfollowedAt: new Date(event.timestamp) },
      });
      return `leave:${src.chatType}`;
    }

    case "message": {
      const e = event as webhook.MessageEvent;
      const customer = await ensureConversation(src);
      const described = describeMessage(e.message);
      const { type, text } = described;
      const sender = await resolveSender(customer.id, src);
      const preview = sender ? `${sender.name}: ${described.preview}` : described.preview;
      const sentAt = new Date(e.timestamp);

      let created: { id: string };
      try {
        created = await prisma.chatMessage.create({
          select: { id: true },
          data: {
            customerId: customer.id,
            direction: "INBOUND",
            type,
            text,
            payload: e.message as unknown as Prisma.InputJsonValue,
            lineMessageId: e.message.id,
            sentAt,
            ...(src.chatType !== "user"
              ? { senderLineId: src.senderId, senderName: sender?.name ?? null, senderPictureUrl: sender?.pictureUrl ?? null }
              : {}),
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

      // เก็บ reply token ไว้ตอบฟรี (เฉพาะ event สด ไม่ใช่ที่ LINE ส่งซ้ำ และใหม่กว่า token เดิม)
      if (e.replyToken && !e.deliveryContext?.isRedelivery) {
        await prisma.customer.updateMany({
          where: { id: customer.id, OR: [{ lastReplyTokenAt: null }, { lastReplyTokenAt: { lt: sentAt } }] },
          data: { lastReplyToken: e.replyToken, lastReplyTokenAt: sentAt },
        });
      }

      // แจ้งเตือนทีมบนมือถือ/คอม (ข้ามข้อความเก่าที่ LINE ส่งซ้ำมาช้า)
      if (Date.now() - sentAt.getTime() < 10 * 60_000) {
        const c = await prisma.customer.findUnique({
          where: { id: customer.id },
          select: { fullName: true, lineName: true, lineUserId: true },
        });
        if (c) {
          await sendPush({
            title: displayName(c),
            body: preview.slice(0, 120),
            url: `/chats?c=${customer.id}`,
            tag: `chat-${customer.id}`,
          });
        }
      }

      // รูป/วิดีโอ/ไฟล์ → คัดลอกไป Google Drive ทันที (ถ้าเชื่อมไว้) เพราะ LINE เก็บไว้ชั่วคราว
      if (MEDIA_TYPES.includes(type)) {
        const saved = await saveMessageMedia(created.id);
        return `message:${type}:${saved}`;
      }
      return `message:${type}`;
    }

    default:
      return `skip: ${event.type}`;
  }
}
