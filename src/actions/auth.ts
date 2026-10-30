"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authSecretProblem, getSession } from "@/lib/session";

export type LoginState = { error?: string; email?: string } | undefined;

const LoginSchema = z.object({
  email: z.email("อีเมลไม่ถูกต้อง").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

// hash หลอกไว้เทียบเวลาเมื่อไม่พบผู้ใช้ เพื่อไม่ให้เดาได้ว่าอีเมลไหนมีในระบบ
const DUMMY_HASH = "$2b$10$ZBCV2m0QBVzuawCxjgKzKuSR1CCB5QbhjFTxU8DaExHCKsp.slHu2";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");

  // ตรวจการตั้งค่าก่อน เพื่อแสดงข้อความที่แก้ได้ แทนหน้า error ของ server
  const configProblem = authSecretProblem();
  if (configProblem) {
    console.error(`[login] ${configProblem}`);
    return { error: `ระบบยังตั้งค่าไม่ครบ: ${configProblem}`, email };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง", email };
  }

  let user;
  try {
    user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  } catch (error) {
    console.error("[login] database error", error);
    return { error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง", email };
  }

  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", email };
  }
  if (!user.isActive) {
    return { error: "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ", email };
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  redirect(safeNext(formData.get("next")));
}

/** กลับไปหน้าที่ตั้งใจจะเข้าก่อนถูกส่งมาล็อกอิน (เฉพาะ path ภายในเว็บเท่านั้น) */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
