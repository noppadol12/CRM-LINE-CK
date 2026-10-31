"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveCarrier, type CarrierInput } from "@/actions/shipping";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CARRIER_KINDS, PAYMENT_LABEL } from "@/lib/provinces";
import { Field, selectCls } from "./fields";

export type CarrierFormValues = {
  id: string;
  name: string;
  kind: string;
  phone: string | null;
  lineId: string | null;
  dropoffAddress: string | null;
  mapUrl: string | null;
  cutoffTime: string | null;
  payment: string | null;
  priceNote: string | null;
  trackingUrl: string | null;
  note: string | null;
  isActive: boolean;
};

function Form({ carrier, onDone }: { carrier?: CarrierFormValues; onDone: (id: string) => void }) {
  const [v, setV] = useState<CarrierInput>({
    name: carrier?.name ?? "",
    kind: carrier?.kind ?? "freight",
    phone: carrier?.phone ?? "",
    lineId: carrier?.lineId ?? "",
    dropoffAddress: carrier?.dropoffAddress ?? "",
    mapUrl: carrier?.mapUrl ?? "",
    cutoffTime: carrier?.cutoffTime ?? "",
    payment: carrier?.payment ?? "",
    priceNote: carrier?.priceNote ?? "",
    trackingUrl: carrier?.trackingUrl ?? "",
    note: carrier?.note ?? "",
    isActive: carrier?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof CarrierInput) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await saveCarrier(carrier?.id ?? null, v);
          if (!r.ok) return setError(r.error);
          toast.success(r.message);
          onDone(r.data!.id);
        });
      }}
      className="space-y-5"
    >
      {error && <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อขนส่ง" htmlFor="c-name" className="sm:col-span-2">
          <Input id="c-name" value={v.name} onChange={set("name")} placeholder="เช่น นิ่มเอ็กซ์เพรส, สมใจขนส่ง" required autoFocus maxLength={100} />
        </Field>
        <Field label="ประเภท" htmlFor="c-kind">
          <select id="c-kind" value={v.kind} onChange={set("kind")} className={selectCls}>
            {Object.entries(CARRIER_KINDS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="การเก็บเงินค่าส่ง" htmlFor="c-pay">
          <select id="c-pay" value={v.payment ?? ""} onChange={set("payment")} className={selectCls}>
            <option value="">— ไม่ระบุ —</option>
            {Object.entries(PAYMENT_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เบอร์โทร" htmlFor="c-phone">
          <Input id="c-phone" value={v.phone ?? ""} onChange={set("phone")} placeholder="02-xxx-xxxx" />
        </Field>
        <Field label="LINE ของขนส่ง" htmlFor="c-line">
          <Input id="c-line" value={v.lineId ?? ""} onChange={set("lineId")} placeholder="@xxxx" />
        </Field>
        <Field label="จุดส่งของ (ฝั่งร้าน)" htmlFor="c-drop" className="sm:col-span-2" hint="ท่ารถ/สาขาที่ร้านนำของไปส่ง">
          <Textarea id="c-drop" rows={2} value={v.dropoffAddress ?? ""} onChange={set("dropoffAddress")} placeholder="เช่น ท่ารถหมอชิต 2 ช่อง 45" />
        </Field>
        <Field label="ลิงก์ Google Maps" htmlFor="c-map">
          <Input id="c-map" value={v.mapUrl ?? ""} onChange={set("mapUrl")} placeholder="https://maps.app.goo.gl/..." />
        </Field>
        <Field label="เวลาปิดรับของ" htmlFor="c-cut">
          <Input id="c-cut" value={v.cutoffTime ?? ""} onChange={set("cutoffTime")} placeholder="เช่น 16:00 (จ.-ส.)" />
        </Field>
        <Field label="ลิงก์ติดตามพัสดุ" htmlFor="c-track" className="sm:col-span-2" hint="ใส่ {เลขพัสดุ} ตรงตำแหน่งเลข ระบบจะแนบลิงก์ให้ลูกค้าอัตโนมัติ">
          <Input id="c-track" value={v.trackingUrl ?? ""} onChange={set("trackingUrl")} placeholder="https://.../track?no={เลขพัสดุ}" />
        </Field>
        <Field label="ราคา / เงื่อนไข" htmlFor="c-price" className="sm:col-span-2">
          <Textarea id="c-price" rows={2} value={v.priceNote ?? ""} onChange={set("priceNote")} placeholder="เช่น คิดตามขนาดกล่อง ขั้นต่ำ 100 บาท" />
        </Field>
        <Field label="หมายเหตุ" htmlFor="c-note" className="sm:col-span-2">
          <Textarea id="c-note" rows={2} value={v.note ?? ""} onChange={set("note")} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={v.isActive} onChange={(e) => setV((s) => ({ ...s, isActive: e.target.checked }))} className="size-4 accent-primary" />
          ใช้งานอยู่ (ปิดไว้ถ้าเลิกใช้เจ้านี้ — ข้อมูลเก่ายังอยู่)
        </label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !v.name.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          {carrier ? "บันทึก" : "เพิ่มขนส่ง"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CarrierFormDialog({ carrier, trigger }: { carrier?: CarrierFormValues; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{carrier ? `แก้ไข ${carrier.name}` : "เพิ่มบริษัทขนส่ง"}</DialogTitle>
          <DialogDescription>ข้อมูลติดต่อและจุดส่งของ — เพิ่มจังหวัดที่ไปได้ในหน้าของขนส่งเจ้านี้</DialogDescription>
        </DialogHeader>
        {open && (
          <Form
            carrier={carrier}
            onDone={(id) => {
              setOpen(false);
              if (!carrier) router.push(`/shipping/carriers/${id}`);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
