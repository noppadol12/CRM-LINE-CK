"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { requestPasswordReset, type ForgotState } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const back = (
  <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="size-4" /> กลับไปหน้าเข้าสู่ระบบ
  </Link>
);

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, undefined);

  if (state?.done) {
    const email = state.mode === "email";
    const Icon = email ? MailCheck : ShieldCheck;
    return (
      <div className="space-y-6">
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-5" />
          </span>
          {email ? (
            <>
              <p className="font-medium">เช็คอีเมลของคุณ</p>
              <p className="text-sm text-muted-foreground">
                ถ้า <span className="font-medium text-foreground">{state.email}</span> มีบัญชีในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว ลิงก์ใช้ได้ 30 นาที
                (ถ้าไม่เจอ ลองดูในโฟลเดอร์สแปม)
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">ส่งคำขอถึงผู้ดูแลแล้ว</p>
              <p className="text-sm text-muted-foreground">
                เจ้าของหรือแอดมินจะได้รับแจ้งเตือน และส่ง<span className="font-medium text-foreground">รหัสชั่วคราว</span>ให้คุณ
                ใช้รหัสนั้นเข้าสู่ระบบ แล้วตั้งรหัสใหม่ของตัวเอง
              </p>
            </>
          )}
        </div>
        {back}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" defaultValue={state?.email} required autoFocus className="h-10" />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "กำลังส่ง…" : "ขอตั้งรหัสผ่านใหม่"}
      </Button>
      {back}
    </form>
  );
}
