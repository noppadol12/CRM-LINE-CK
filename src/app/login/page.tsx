import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · CK CRM" };

export default function LoginPage() {
  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="สำหรับทีมแอดมินและเซลส์">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
