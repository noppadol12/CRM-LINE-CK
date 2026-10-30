"use client";

import Link from "next/link";
import { MessagesSquare, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomer, restoreCustomer } from "@/actions/customers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomerFormDialog, type CustomerFormValues } from "@/components/customers/customer-form-dialog";
import { Button } from "@/components/ui/button";

export function CustomerActions({
  customer,
  name,
  canManage,
  hasLine,
}: {
  customer: CustomerFormValues;
  name: string;
  canManage: boolean;
  hasLine: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {hasLine && (
        <Button variant="outline" asChild>
          <Link href={`/chats?c=${customer.id}`}>
            <MessagesSquare />
            แชท
          </Link>
        </Button>
      )}
      <CustomerFormDialog
        customer={customer}
        trigger={
          <Button variant="outline">
            <Pencil />
            แก้ไข
          </Button>
        }
      />
      {canManage && (
        <ConfirmDialog
          title={`ลบ ${name}?`}
          description="ลูกค้าจะถูกย้ายไปถังขยะ ประวัติแชทและแต้มยังเก็บไว้ครบ และกู้คืนได้ภายหลัง"
          confirmLabel="ย้ายไปถังขยะ"
          onConfirm={async () => {
            const r = await deleteCustomer(customer.id!, { redirectTo: "/customers" });
            // ถ้าสำเร็จ action จะ redirect ไปหน้ารายชื่อเอง
            if (r && !r.ok) toast.error(r.error);
          }}
          trigger={
            <Button variant="ghost" size="icon" aria-label="ลบลูกค้า" className="text-muted-foreground hover:text-destructive">
              <Trash2 />
            </Button>
          }
        />
      )}
    </div>
  );
}

export function RestoreBanner({ id, canManage, deletedAt }: { id: string; canManage: boolean; deletedAt: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
      <Trash2 className="size-4 shrink-0" />
      <span className="flex-1">ลูกค้ารายนี้อยู่ในถังขยะ (ลบเมื่อ {deletedAt})</span>
      {canManage && (
        <Button
          size="sm"
          variant="outline"
          className="bg-white"
          onClick={async () => {
            const r = await restoreCustomer(id);
            if (r.ok) toast.success(r.message);
            else toast.error(r.error);
          }}
        >
          <RotateCcw />
          กู้คืน
        </Button>
      )}
    </div>
  );
}
