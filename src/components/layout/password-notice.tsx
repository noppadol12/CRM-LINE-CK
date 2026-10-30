import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

/** เตือนให้เปลี่ยนรหัสผ่านชั่วคราวที่หัวหน้าตั้งให้ */
export async function PasswordNotice() {
  const user = await getCurrentUser();
  if (!user.mustChangePassword) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <KeyRound className="size-4 shrink-0" />
      <p className="flex-1">คุณกำลังใช้รหัสผ่านชั่วคราว กรุณาตั้งรหัสผ่านใหม่ของคุณเอง</p>
      <Link href="/settings#account" className="font-medium underline underline-offset-2">
        เปลี่ยนรหัสผ่าน
      </Link>
    </div>
  );
}
