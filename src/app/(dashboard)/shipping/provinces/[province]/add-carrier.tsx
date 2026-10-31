"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveCoverage } from "@/actions/shipping";
import { Field, selectCls } from "@/components/shipping/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddCarrierToProvince({ province, carriers }: { province: string; carriers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [carrierId, setCarrierId] = useState("");
  const [v, setV] = useState({ branch: "", phone: "", transitDays: "", note: "" });
  const [pending, start] = useTransition();
  const chosen = carrierId || carriers[0]?.id || "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> เพิ่มขนส่ง
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มขนส่งที่ไป{province}</DialogTitle>
          <DialogDescription>
            ยังไม่มีในรายการ? <Link href="/shipping?tab=carriers" className="text-primary hover:underline">เพิ่มบริษัทขนส่งใหม่</Link> ก่อน
          </DialogDescription>
        </DialogHeader>
        {carriers.length === 0 ? (
          <p className="text-sm text-muted-foreground">ขนส่งทุกเจ้าที่ใช้งานอยู่ไปจังหวัดนี้แล้ว หรือยังไม่มีขนส่งในระบบ</p>
        ) : (
          <div className="space-y-3">
            <Field label="ขนส่ง" htmlFor="ac-carrier">
              <select id="ac-carrier" value={chosen} onChange={(e) => setCarrierId(e.target.value)} className={selectCls}>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="สาขา/ท่ารถปลายทาง" htmlFor="ac-branch">
              <Input id="ac-branch" value={v.branch} onChange={(e) => setV({ ...v, branch: e.target.value })} placeholder={`เช่น สาขา${province}`} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="เบอร์สาขา" htmlFor="ac-phone">
                <Input id="ac-phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
              </Field>
              <Field label="ระยะเวลา" htmlFor="ac-days">
                <Input id="ac-days" value={v.transitDays} onChange={(e) => setV({ ...v, transitDays: e.target.value })} placeholder="1-2 วัน" />
              </Field>
            </div>
            <Field label="หมายเหตุ" htmlFor="ac-note">
              <Input id="ac-note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={!chosen || pending}
            onClick={() =>
              start(async () => {
                const r = await saveCoverage(chosen, province, v);
                if (r.ok) {
                  toast.success(r.message);
                  setOpen(false);
                  setV({ branch: "", phone: "", transitDays: "", note: "" });
                  setCarrierId("");
                } else toast.error(r.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            เพิ่ม
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
