import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
};

export const SESSION_COOKIE = "ckcrm_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 วัน

export function sessionOptions(): SessionOptions {
  const password = process.env.AUTH_SECRET;
  if (!password || password.length < 32) {
    throw new Error("AUTH_SECRET ต้องตั้งค่าใน Environment Variables และยาวอย่างน้อย 32 ตัวอักษร");
  }
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
