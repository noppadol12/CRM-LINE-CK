"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { getLabelDefaults, saveRecipient } from "@/actions/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { bangkokDayKey } from "@/lib/deal-stages";
import { encodeLabels, LABEL_CARRIERS, LABEL_LAYOUTS, MAX_BOXES, type LabelCarrierKey, type LabelLayout } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Defaults = NonNullable<Awaited<ReturnType<typeof getLabelDefaults>>>;
const LAYOUT_KEY = "ck-label-layout";

function readLayout(): LabelLayout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "2" ? "2" : "4";
  } catch {
    return "4";
  }
}

function Form({ customerId, d, onDone }: { customerId: string; d: Defaults; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(d.name);
  const [company, setCompany] = useState(d.company);
  const [phone, setPhone] = useState(d.phone);
  const [address, setAddress] = useState(d.address);
  const [note, setNote] = useState(d.note);
  const [carrier, setCarrier] = useState<LabelCarrierKey | "">(d.carrier);
  const [boxes, setBoxes] = useState(Math.max(1, d.boxes || 1));
  const [layout, setLayout] = useState<LabelLayout>(readLayout);
  const [remember, setRemember] = useState(!d.address);
  const [pending, start] = useTransition();
  const changed = name !== d.name || company !== d.company || phone !== d.phone || address !== d.address;

  const print = () => {
    if (!name.trim() || !address.trim()) {
      toast.error("กรอกชื่อและที่อยู่ผู้รับก่อนพิมพ์");
      return;
    }
    try {
      localStorage.setItem(LAYOUT_KEY, layout);
    } catch {}
    const data = encodeLabels([
      {
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim(),
        ref: d.ref,
        carrier,
        boxes,
        date: bangkokDayKey(d.shippedAt ?? new Date()),
      },
    ]);
    // เปิดแท็บใหม่ทันทีจากการกด (กันเบราว์เซอร์บล็อกป๊อปอัป) แล้วค่อยบันทึกที่อยู่
    const win = window.open(`/print/labels?layout=${layout}&d=${data}`, "_blank");
    if (!win) router.push(`/print/labels?layout=${layout}&d=${data}`);
    start(async () => {
      if (remember && changed) {
        const r = await saveRecipient(customerId, { fullName: name, company, phone, address });
        if (!r.ok) toast.error(r.error);
      }
      onDone();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        print();
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lb-name">ชื่อผู้รับ</Label>
          <Input id="lb-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lb-company">บริษัท / ร้าน</Label>
          <Input id="lb-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lb-phone">เบอร์โทร</Label>
          <Input id="lb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lb-address">ที่อยู่</Label>
          <Textarea id="lb-address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={600} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lb-note">หมายเหตุ</Label>
          <Input id="lb-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="เช่น ส่งตามที่อยู่หัวบิล" />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">ขนส่ง</p>
        <div role="radiogroup" aria-label="ขนส่ง" className="flex flex-wrap gap-1.5">
          {[...LABEL_CARRIERS.map((c) => ({ key: c.key as LabelCarrierKey | "", name: c.name })), { key: "" as const, name: "ไม่ระบุ (ติ๊กมือ)" }].map((c) => (
            <button
              key={c.key || "none"}
              type="button"
              role="radio"
              aria-checked={carrier === c.key}
              onClick={() => setCarrier(c.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                carrier === c.key ? "border-primary bg-primary-soft font-medium text-primary" : "hover:bg-accent",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">จำนวนกล่อง</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon-sm" aria-label="ลดจำนวนกล่อง" onClick={() => setBoxes((b) => Math.max(1, b - 1))} disabled={boxes <= 1}>
              <Minus />
            </Button>
            <Input
              aria-label="จำนวนกล่อง"
              inputMode="numeric"
              value={String(boxes)}
              onChange={(e) => setBoxes(Math.max(1, Math.min(MAX_BOXES, Number(e.target.value.replace(/\D/g, "")) || 1)))}
              className="h-8 w-14 text-center"
            />
            <Button type="button" variant="outline" size="icon-sm" aria-label="เพิ่มจำนวนกล่อง" onClick={() => setBoxes((b) => Math.min(MAX_BOXES, b + 1))}>
              <Plus />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">รูปแบบกระดาษ</p>
          <div role="radiogroup" aria-label="รูปแบบกระดาษ" className="grid grid-cols-2 rounded-md bg-muted p-0.5 text-sm">
            {LABEL_LAYOUTS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={layout === o.value}
                onClick={() => setLayout(o.value)}
                className={cn("rounded px-3 py-1.5", layout === o.value ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {changed && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-primary" />
          บันทึกชื่อ เบอร์ และที่อยู่นี้ไว้ในข้อมูลลูกค้า
        </label>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Printer />}
          พิมพ์ {boxes > 1 ? `${boxes} ใบ` : "ใบปะหน้า"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** หน้าต่างพิมพ์ใบปะหน้า — จากลูกค้า หรือจากรายการส่งของ (shipmentId) */
export function LabelDialog({
  customerId,
  shipmentId,
  trigger,
  open: controlled,
  onOpenChange,
}: {
  customerId: string;
  shipmentId?: string | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [inner, setInner] = useState(false);
  const open = controlled ?? inner;
  const setOpen = onOpenChange ?? setInner;
  const [data, setData] = useState<Defaults | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getLabelDefaults(customerId, shipmentId).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [open, customerId, shipmentId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>พิมพ์ใบปะหน้า</DialogTitle>
          <DialogDescription>ตรวจชื่อและที่อยู่ผู้รับ แล้วกดพิมพ์ — ผู้ส่งตั้งได้ที่ ตั้งค่า → ข้อมูลผู้ส่ง</DialogDescription>
        </DialogHeader>
        {open && data ? (
          <Form key={`${customerId}-${shipmentId ?? ""}`} customerId={customerId} d={data} onDone={() => setOpen(false)} />
        ) : data === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ไม่พบลูกค้า</p>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-20" />
            <Skeleton className="h-9" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
