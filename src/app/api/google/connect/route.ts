import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getApiUser } from "@/lib/auth";
import { buildAuthUrl, googleClient } from "@/lib/google-drive";
import { canManage } from "@/lib/permissions";

const STATE_COOKIE = "ckcrm_gstate";

/** GET /api/google/connect — เริ่มเชื่อมต่อ Google Drive (เฉพาะเจ้าของ/แอดมิน) */
export async function GET(request: Request) {
  const user = await getApiUser();
  const origin = new URL(request.url).origin;
  if (!user) return Response.redirect(`${origin}/login`, 303);
  if (!canManage(user)) return Response.redirect(`${origin}/settings?drive=forbidden#storage`, 303);
  if (!googleClient()) return Response.redirect(`${origin}/settings?drive=config#storage`, 303);

  // state กันคนอื่นหลอกให้ระบบผูกกับ Drive ของเขา (CSRF)
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return Response.redirect(buildAuthUrl(origin, state), 303);
}
