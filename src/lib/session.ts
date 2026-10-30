import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
};

export const SESSION_COOKIE = "ckcrm_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 วัน

/** คืนข้อความอธิบายถ้า AUTH_SECRET ใช้ไม่ได้ (ไม่แสดงค่าจริง) */
export function authSecretProblem(): string | null {
  const password = process.env.AUTH_SECRET?.trim();
  if (!password) return "ไม่พบ AUTH_SECRET ใน Environment Variables (เพิ่มแล้วต้อง Redeploy)";
  if (password.length < 32) return `AUTH_SECRET สั้นเกินไป (${password.length} ตัวอักษร ต้องอย่างน้อย 32)`;
  return null;
}

export function sessionOptions(): SessionOptions {
  const problem = authSecretProblem();
  if (problem) throw new Error(problem);
  const password = process.env.AUTH_SECRET!.trim();
  return {
    cookieName: SESSION_COOKIE,
    password,
    ttl: SESSION_TTL,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
