"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { purgeDemoData } from "@/actions/demo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function PurgeDemoButton({ count }: { count: number }) {
  return (
    <ConfirmDialog
      title={`ลบลูกค้าตัวอย่าง ${count} ราย?`}
      description="ลบถาวรพร้อมแชท โน้ต และดีลของลูกค้าตัวอย่าง (LINE ID ขึ้นต้นด้วย Udemo) แท็กตัวอย่างที่ไม่มีลูกค้าจริงใช้จะถูกลบด้วย ข้อมูลลูกค้าจริงไม่ถูกแตะ"
      confirmLabel="ลบข้อมูลตัวอย่าง"
      onConfirm={async () => {
        const r = await purgeDemoData();
        if (r.ok) toast.success(r.message);
        else toast.error(r.error);
      }}
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 />
          ลบข้อมูลตัวอย่างทั้งหมด
        </Button>
      }
    />
  );
}
