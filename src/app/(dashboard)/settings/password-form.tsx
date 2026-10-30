"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, type PasswordState } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <p className="text-sm font-medium">เปลี่ยนรหัสผ่าน</p>
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="current">รหัสผ่านปัจจุบัน</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="next">รหัสผ่านใหม่</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">ยืนยันรหัสผ่านใหม่</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        เปลี่ยนรหัสผ่าน
      </Button>
    </form>
  );
}
