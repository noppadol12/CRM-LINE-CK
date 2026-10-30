"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PasswordSchema = z
  .object({
    current: z.string().min(1, "กรอกรหัสผ่านปัจจุบัน"),
    next: z.string().min(8, "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร").max(100),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "รหัสผ่านใหม่ไม่ตรงกัน", path: ["confirm"] });

export type PasswordState = ActionResult | undefined;

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await getCurrentUser();
  const parsed = PasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const record = await prisma.adminUser.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record?.passwordHash || !(await bcrypt.compare(parsed.data.current, record.passwordHash))) {
    return { ok: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });
  return { ok: true, message: "เปลี่ยนรหัสผ่านแล้ว" };
}
