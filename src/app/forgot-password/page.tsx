import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน · CK CRM" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="ลืมรหัสผ่าน" subtitle="กรอกอีเมลที่ใช้เข้าระบบ เพื่อตั้งรหัสผ่านใหม่">
      <ForgotForm />
    </AuthShell>
  );
}
