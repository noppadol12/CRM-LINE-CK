import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";

/**
 * ด่านแรกแบบเร็ว (optimistic): ไม่มี session ที่ถอดรหัสได้ → ส่งไปหน้า login
 * การตรวจสิทธิ์จริงทำใน getCurrentUser() (src/lib/auth.ts) ทุกครั้งที่อ่านข้อมูล
 */
const COOKIE = "ckcrm_session";
const PUBLIC_PATHS = ["/login"];

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const seal = request.cookies.get(COOKIE)?.value;
  const password = process.env.AUTH_SECRET?.trim();
  if (!seal || !password) return false;
  try {
    const data = await unsealData<{ userId?: string }>(seal, { password });
    return Boolean(data.userId);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const loggedIn = await hasValidSession(request);

  if (!loggedIn && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (loggedIn && (isPublic || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // ไม่ครอบ /api (webhook ของ LINE ต้องเข้าได้โดยไม่ล็อกอิน) และไฟล์ static
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
