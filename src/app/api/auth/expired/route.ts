import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * session ใช้ไม่ได้แล้ว (ปิดบัญชี / เปลี่ยนรหัสผ่าน / รีเซ็ตรหัส) → ลบคุกกี้แล้วไปหน้า login
 * ต้องลบคุกกี้ที่นี่ ไม่งั้น proxy จะเห็นคุกกี้เดิมแล้วส่งกลับแดชบอร์ดวนไปมา
 */
export async function GET() {
  try {
    const session = await getSession();
    session.destroy();
  } catch {
    // AUTH_SECRET ผิด → ไม่มีอะไรให้ลบ
  }
  redirect("/login");
}
