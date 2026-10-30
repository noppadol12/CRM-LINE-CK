import "server-only";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** สิทธิ์ลบลูกค้า / จัดการแท็ก: เจ้าของและแอดมิน (เซลส์แก้ไขข้อมูลได้แต่ลบไม่ได้) */
export function canManage(user: CurrentUser) {
  return user.role === "OWNER" || user.role === "ADMIN";
}

export async function requireManager(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return canManage(user) ? user : null;
}

export const NO_PERMISSION: ActionResult = { ok: false, error: "บัญชีของคุณไม่มีสิทธิ์ทำรายการนี้" };
