"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCustomer, updateCustomer, type CustomerFormState } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/lib/format";

export type CustomerFormValues = {
  id?: string;
  fullName?: string | null;
  lineName?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  address?: string | null;
  hasLine?: boolean;
};

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function CustomerFormDialog({
  trigger,
  customer,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  customer?: CustomerFormValues;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const isEdit = Boolean(customer?.id);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้า"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "ข้อมูลที่แก้จะไม่ส่งผลกับโปรไฟล์ LINE ของลูกค้า" : "สำหรับลูกค้าที่ติดต่อทางโทรศัพท์หรือหน้าร้าน ยังไม่ได้เพิ่มเพื่อน LINE"}
          </DialogDescription>
        </DialogHeader>
        {/* ฟอร์ม mount ใหม่ทุกครั้งที่เปิด จึงไม่มี error ค้างจากรอบก่อน */}
        <CustomerForm customer={customer} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CustomerForm({ customer, onDone }: { customer?: CustomerFormValues; onDone: () => void }) {
  const isEdit = Boolean(customer?.id);
  const router = useRouter();
  const action = isEdit ? updateCustomer.bind(null, customer!.id!) : createCustomer;
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(action, undefined);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const handled = useRef<CustomerFormState>(undefined);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(state.message ?? "บันทึกแล้ว");
      onDone();
      if (!isEdit && state.data?.id) router.push(`/customers/${state.data.id}`);
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, isEdit, router, onDone]);

  return (
    <form
      // ส่งเองแทน action={} เพื่อไม่ให้ React ล้างค่าที่พิมพ์ไว้เมื่อกรอกไม่ถูกต้อง
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
          <Field id="fullName" label="ชื่อ-นามสกุล" error={fe?.fullName}>
            <Input id="fullName" name="fullName" defaultValue={customer?.fullName ?? ""} autoFocus aria-invalid={!!fe?.fullName} />
          </Field>
          <Field
            id="lineName"
            label="ชื่อเล่น / ชื่อ LINE"
            hint={customer?.hasLine ? "ระบบอัปเดตจาก LINE อัตโนมัติ" : undefined}
          >
            <Input id="lineName" name="lineName" defaultValue={customer?.lineName ?? ""} />
          </Field>
          <Field id="phone" label="เบอร์โทร" error={fe?.phone}>
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              placeholder="081-234-5678"
              defaultValue={formatPhone(customer?.phone)}
              aria-invalid={!!fe?.phone}
            />
          </Field>
          <Field id="email" label="อีเมล" error={fe?.email}>
            <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} aria-invalid={!!fe?.email} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="company" label="บริษัท / ร้าน" error={fe?.company}>
              <Input id="company" name="company" defaultValue={customer?.company ?? ""} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="address" label="ที่อยู่จัดส่ง" error={fe?.address}>
              <Textarea id="address" name="address" rows={3} defaultValue={customer?.address ?? ""} />
            </Field>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isEdit ? "บันทึก" : "เพิ่มลูกค้า"}
            </Button>
          </DialogFooter>
    </form>
  );
}
