"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { resetPassword, type ResetState } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {/* ช่วยให้ตัวจัดการรหัสผ่านของเบราว์เซอร์บันทึกคู่กับอีเมลถูกบัญชี */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <p className="rounded-lg bg-muted px-3 py-2 text-sm">
        บัญชี: <span className="font-medium">{email}</span>
      </p>
      {state?.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">รหัสผ่านใหม่</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">ยืนยันรหัสผ่านใหม่</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-10" />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "กำลังบันทึก…" : "ตั้งรหัสผ่านใหม่"}
      </Button>
    </form>
  );
}
