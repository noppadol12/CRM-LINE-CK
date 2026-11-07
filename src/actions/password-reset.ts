"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicBaseUrl } from "@/lib/file-response";
import { mailEnabled, resetPasswordEmail, sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

const TOKEN_MINUTES = 30;
const MAX_PER_EMAIL_HOUR = 3;
const MAX_PER_IP_HOUR = 10;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { ip, origin: `${proto}://${host}` };
}

export type ForgotState = { done?: boolean; mode?: "email" | "admin"; error?: string; email?: string } | undefined;

/**
 * ลืมรหัสผ่าน — ตอบข้อความเดียวกันเสมอ ไม่บอกว่าอีเมลไหนมีในระบบ
 * - ตั้ง SMTP แล้ว: ส่งลิงก์ตั้งรหัสใหม่ทางอีเมล
 * - ยังไม่ตั้ง: แจ้งเจ้าของ/แอดมินให้รีเซ็ตให้ (เห็นในตั้งค่า → ทีมงาน + แจ้งเตือนมือถือ)
 */
export async function requestPasswordReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const parsed = z.email().safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: "อีเมลไม่ถูกต้อง", email: String(fd.get("email") ?? "") };
  const email = parsed.data;
  const mode = mailEnabled() ? "email" : "admin";
  const { ip, origin } = await requestMeta();

  try {
    const hourAgo = new Date(Date.now() - 60 * 60_000);
    const byIp = await prisma.passwordResetToken.count({ where: { ip, createdAt: { gte: hourAgo } } });
    if (byIp >= MAX_PER_IP_HOUR) return { error: "ขอรีเซ็ตบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", email };

    const user = await prisma.adminUser.findUnique({ where: { email }, select: { id: true, name: true, email: true, isActive: true, resetRequestedAt: true } });
    if (user?.isActive) {
      const recent = await prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: hourAgo } } });
      if (recent < MAX_PER_EMAIL_HOUR) {
        if (mode === "email") {
          const token = randomBytes(32).toString("base64url");
          await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60_000), ip },
          });
          const link = `${publicBaseUrl(origin)}/reset-password?token=${token}`;
          await sendMail({ to: user.email, ...resetPasswordEmail(user.name, link, TOKEN_MINUTES) });
        } else {
          // บันทึกไว้ใช้นับความถี่ด้วย (token สุ่มที่ไม่มีใครรู้ → ใช้ตั้งรหัสไม่ได้)
          await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash: hashToken(randomBytes(32).toString("hex")), expiresAt: new Date(), usedAt: new Date(), ip },
          });
          const alreadyAsked = user.resetRequestedAt && Date.now() - user.resetRequestedAt.getTime() < 60 * 60_000;
          await prisma.adminUser.update({ where: { id: user.id }, data: { resetRequestedAt: new Date() } });
          if (!alreadyAsked) {
            const managers = await prisma.adminUser.findMany({
              where: { isActive: true, role: { in: ["OWNER", "ADMIN"] }, id: { not: user.id } },
              select: { id: true },
            });
            await sendPush(
              { title: "ขอรีเซ็ตรหัสผ่าน", body: `${user.name} (${user.email}) ลืมรหัสผ่าน — กดเพื่อรีเซ็ตให้`, url: "/settings#team", tag: `reset-${user.id}` },
              { userIds: managers.map((m) => m.id) },
            ).catch(() => undefined);
          }
        }
      }
    }
  } catch (e) {
    console.error("[password-reset] request failed", e);
    if (mode === "email") return { error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ หรือติดต่อเจ้าของระบบ", email };
  }
  return { done: true, mode, email };
}

export type ResetState = { error?: string } | undefined;

const ResetSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: z.string().min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร").max(100),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน", path: ["confirm"] });

/** ลิงก์ยังใช้ได้ไหม (ใช้ตอนเปิดหน้า) */
export async function checkResetToken(token: string) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true, user: { select: { email: true, isActive: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) return null;
  return { email: row.user.email };
}

export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const parsed = ResetSchema.safeParse({ token: fd.get("token"), password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { token, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const ok = await prisma.$transaction(async (tx) => {
    // จองใช้ token แบบ atomic — กดซ้ำ/เปิดสองแท็บ ใช้ได้ครั้งเดียว
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (!claimed.count) return false;
    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { userId: true, user: { select: { email: true, isActive: true } } } });
    if (!row?.user.isActive) return false;
    await tx.adminUser.update({
      where: { id: row.userId },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 }, resetRequestedAt: null },
    });
    await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.loginAttempt.deleteMany({ where: { email: row.user.email, success: false } });
    return true;
  });
  if (!ok) return { error: "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่" };
  redirect("/login?reset=1");
}
