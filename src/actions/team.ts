"use server";

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import { z } from "zod";
import { Prisma, type AdminRole } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canManageMember, rolesAssignableBy } from "@/lib/team";

const ROLES = ["OWNER", "ADMIN", "SALES"] as const;
const DENIED = { ok: false as const, error: "คุณไม่มีสิทธิ์จัดการบัญชีนี้" };

/** รหัสชั่วคราว 10 ตัว (ตัดตัวที่สับสนง่าย เช่น 0/O, 1/l) */
function tempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join("");
}

const MemberSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อ").max(80),
  email: z.email("อีเมลไม่ถูกต้อง").transform((v) => v.trim().toLowerCase()),
  role: z.enum(ROLES),
});

type TempPassword = { password: string; email: string };

export async function createMember(input: { name: string; email: string; role: AdminRole }): Promise<ActionResult<TempPassword>> {
  const actor = await getCurrentUser();
  const parsed = MemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!rolesAssignableBy(actor).includes(parsed.data.role)) return DENIED;

  const password = tempPassword();
  try {
    await prisma.adminUser.create({
      data: { ...parsed.data, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "อีเมลนี้มีบัญชีอยู่แล้ว" };
    }
    throw e;
  }
  refresh();
  return { ok: true, message: `เพิ่ม ${parsed.data.name} แล้ว`, data: { password, email: parsed.data.email } };
}

/** ต้องเหลือเจ้าของที่ใช้งานได้อย่างน้อย 1 คนเสมอ */
async function wouldRemoveLastOwner(targetId: string) {
  const others = await prisma.adminUser.count({ where: { role: "OWNER", isActive: true, id: { not: targetId } } });
  return others === 0;
}

export async function updateMember(id: string, input: { name: string; role: AdminRole }): Promise<ActionResult> {
  const actor = await getCurrentUser();
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target || !canManageMember(actor, target)) return DENIED;

  const parsed = MemberSchema.pick({ name: true, role: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, role } = parsed.data;

  if (role !== target.role) {
    if (!rolesAssignableBy(actor).includes(role)) return DENIED;
    if (target.id === actor.id) return { ok: false, error: "เปลี่ยนสิทธิ์ของตัวเองไม่ได้" };
    if (target.role === "OWNER" && (await wouldRemoveLastOwner(target.id))) {
      return { ok: false, error: "ต้องมีเจ้าของอย่างน้อย 1 คน" };
    }
  }

  await prisma.adminUser.update({ where: { id }, data: { name, role } });
  refresh();
  return { ok: true, message: "บันทึกแล้ว" };
}

export async function resetMemberPassword(id: string): Promise<ActionResult<TempPassword>> {
  const actor = await getCurrentUser();
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
  if (!target || !canManageMember(actor, target)) return DENIED;
  if (target.id === actor.id) return { ok: false, error: "เปลี่ยนรหัสของตัวเองที่ส่วน “บัญชีของฉัน”" };

  const password = tempPassword();
  await prisma.adminUser.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true, sessionVersion: { increment: 1 } },
  });
  await prisma.loginAttempt.deleteMany({ where: { email: target.email, success: false } });
  refresh();
  return { ok: true, message: "รีเซ็ตรหัสผ่านแล้ว", data: { password, email: target.email } };
}

export async function setMemberActive(id: string, active: boolean): Promise<ActionResult> {
  const actor = await getCurrentUser();
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target || !canManageMember(actor, target)) return DENIED;
  if (target.id === actor.id) return { ok: false, error: "ปิดบัญชีของตัวเองไม่ได้" };
  if (!active && target.role === "OWNER" && (await wouldRemoveLastOwner(target.id))) {
    return { ok: false, error: "ต้องมีเจ้าของที่ใช้งานได้อย่างน้อย 1 คน" };
  }

  // ปิดบัญชี → เพิ่ม sessionVersion ให้หลุดจากระบบทุกเครื่องทันที
  await prisma.adminUser.update({
    where: { id },
    data: { isActive: active, ...(active ? {} : { sessionVersion: { increment: 1 } }) },
  });
  refresh();
  return { ok: true, message: active ? "เปิดใช้งานบัญชีแล้ว" : "ปิดใช้งานบัญชีแล้ว ผู้ใช้ถูกออกจากระบบทันที" };
}
