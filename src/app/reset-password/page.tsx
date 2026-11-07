import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle } from "lucide-react";
import { checkResetToken } from "@/actions/password-reset";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่ · CK CRM", referrer: "no-referrer" };

async function Content({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  const valid = await checkResetToken(token);
  if (!valid) {
    return (
      <div className="space-y-5">
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว
        </div>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          ขอลิงก์ใหม่
        </Link>
      </div>
    );
  }
  return <ResetForm token={token} email={valid.email} />;
}

export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <AuthShell title="ตั้งรหัสผ่านใหม่" subtitle="รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร">
      <Suspense fallback={<Skeleton className="h-56" />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}
