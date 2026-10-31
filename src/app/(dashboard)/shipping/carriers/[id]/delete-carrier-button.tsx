"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCarrier } from "@/actions/shipping";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteCarrierButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title={`ลบ ${name}?`}
      description="ลบขนส่งและจังหวัดที่ไปทั้งหมด ลูกค้าที่เลือกเจ้านี้จะกลายเป็น “ไม่ระบุ” ประวัติการส่งยังอยู่ — ถ้าแค่เลิกใช้ แนะนำให้แก้ไขแล้วปิด “ใช้งานอยู่” แทน"
      confirmLabel="ลบขนส่ง"
      onConfirm={async () => {
        const r = await deleteCarrier(id);
        if (!r.ok) return void toast.error(r.error);
        toast.success(r.message);
        router.push("/shipping?tab=carriers");
      }}
      trigger={
        <Button variant="ghost" size="icon" aria-label="ลบขนส่ง" className="text-muted-foreground hover:text-destructive">
          <Trash2 />
        </Button>
      }
    />
  );
}
