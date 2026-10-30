import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getApiUser } from "@/lib/auth";
import { completeConnection } from "@/lib/google-drive";
import { canManage } from "@/lib/permissions";

const STATE_COOKIE = "ckcrm_gstate";

function sameState(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** GET /api/google/callback — Google ส่งผู้ใช้กลับมาหลังกดอนุญาต */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (status: string, message?: string) => {
    const q = new URLSearchParams({ drive: status, ...(message ? { msg: message.slice(0, 200) } : {}) });
    return Response.redirect(`${origin}/settings?${q}#storage`, 303);
  };

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/google" });

  const user = await getApiUser();
  if (!user) return Response.redirect(`${origin}/login`, 303);
  if (!canManage(user)) return back("forbidden");

  if (url.searchParams.get("error")) return back("denied");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (!expected || !state || !sameState(expected, state) || !code) return back("error", "ลิงก์ยืนยันหมดอายุ กรุณากดเชื่อมต่อใหม่");

  try {
    await completeConnection(code, origin, user.name);
    return back("connected");
  } catch (e) {
    console.error("[google] callback failed", e);
    return back("error", e instanceof Error ? e.message : "เชื่อมต่อไม่สำเร็จ");
  }
}
