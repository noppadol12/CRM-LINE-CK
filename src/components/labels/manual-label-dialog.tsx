"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Printer, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bangkokDayKey } from "@/lib/deal-stages";
import { encodeLabels, LABEL_CARRIERS, LABEL_LAYOUTS, MAX_BOXES, type LabelCarrierKey, type LabelLayout } from "@/lib/labels";
import { cn } from "@/lib/utils";

const LAYOUT_KEY = "ck-label-layout";
const MAX_RECIPIENTS = 20;

type Recipient = { key: number; name: string; company: string; phone: string; address: string; note: string; carrier: LabelCarrierKey | ""; boxes: number };
let seq = 0;
const blank = (carrier: LabelCarrierKey | "" = ""): Recipient => ({ key: ++seq, name: "", company: "", phone: "", address: "", note: "", carrier, boxes: 1 });

function readLayout(): LabelLayout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "2" ? "2" : "4";
  } catch {
    return "4";
  }
}

function RecipientCard({
  r,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  r: Recipient;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<Recipient>) => void;
  onRemove: () => void;
}) {
  const id = (f: string) => `ml-${r.key}-${f}`;
  return (
    <fieldset className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
      <legend className="sr-only">ผู้รับคนที่ {index + 1}</legend>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">ผู้รับ {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`ลบผู้รับคนที่ ${index + 1}`} onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("name")}>ชื่อผู้รับ</Label>
          <Input id={id("name")} value={r.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={200} autoFocus={index > 0} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("company")}>บริษัท / ร้าน</Label>
          <Input id={id("company")} value={r.company} onChange={(e) => onChange({ company: e.target.value })} maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("phone")}>เบอร์โทร</Label>
          <Input id={id("phone")} type="tel" value={r.phone} onChange={(e) => onChange({ phone: e.target.value })} maxLength={80} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("address")}>ที่อยู่</Label>
          <Textarea
            id={id("address")}
            rows={3}
            value={r.address}
            onChange={(e) => onChange({ address: e.target.value })}
            maxLength={600}
            placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("note")}>หมายเหตุ</Label>
          <Input id={id("note")} value={r.note} onChange={(e) => onChange({ note: e.target.value })} maxLength={300} placeholder="ไม่บังคับ" />
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">ขนส่ง</p>
          <div role="radiogroup" aria-label={`ขนส่งของผู้รับคนที่ ${index + 1}`} className="flex flex-wrap gap-1.5">
            {[...LABEL_CARRIERS.map((c) => ({ key: c.key as LabelCarrierKey | "", name: c.name })), { key: "" as const, name: "ติ๊กมือ" }].map((c) => (
              <button
                key={c.key || "none"}
                type="button"
                role="radio"
                aria-checked={r.carrier === c.key}
                onClick={() => onChange({ carrier: c.key })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  r.carrier === c.key ? "border-primary bg-primary-soft font-medium text-primary" : "bg-card hover:bg-accent",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">กล่อง</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon-sm" aria-label="ลดจำนวนกล่อง" onClick={() => onChange({ boxes: Math.max(1, r.boxes - 1) })} disabled={r.boxes <= 1}>
              <Minus />
            </Button>
            <Input
              aria-label={`จำนวนกล่องของผู้รับคนที่ ${index + 1}`}
              inputMode="numeric"
              value={String(r.boxes)}
              onChange={(e) => onChange({ boxes: Math.max(1, Math.min(MAX_BOXES, Number(e.target.value.replace(/\D/g, "")) || 1)) })}
              className="h-8 w-14 text-center"
            />
            <Button type="button" variant="outline" size="icon-sm" aria-label="เพิ่มจำนวนกล่อง" onClick={() => onChange({ boxes: Math.min(MAX_BOXES, r.boxes + 1) })}>
              <Plus />
            </Button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}

/** พิมพ์ใบปะหน้าแยก — กรอกผู้รับเอง ไม่ผูกกับลูกค้า/ดีล (ผู้ส่งใช้ข้อมูลจากตั้งค่า) */
export function ManualLabelDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Recipient[]>(() => [blank()]);
  const [layout, setLayout] = useState<LabelLayout>("4");
  const total = list.reduce((n, r) => n + r.boxes, 0);

  const patch = (key: number, p: Partial<Recipient>) => setList((l) => l.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const print = () => {
    const missing = list.findIndex((r) => !r.name.trim() || !r.address.trim());
    if (missing >= 0) {
      toast.error(`กรอกชื่อและที่อยู่ของผู้รับคนที่ ${missing + 1}`);
      document.getElementById(`ml-${list[missing].key}-${list[missing].name.trim() ? "address" : "name"}`)?.focus();
      return;
    }
    try {
      localStorage.setItem(LAYOUT_KEY, layout);
    } catch {}
    const date = bangkokDayKey(new Date());
    const data = encodeLabels(
      list.map((r) => ({
        name: r.name.trim(),
        company: r.company.trim(),
        phone: r.phone.trim(),
        address: r.address.trim(),
        note: r.note.trim(),
        carrier: r.carrier,
        boxes: r.boxes,
        date,
      })),
    );
    const url = `/print/labels?layout=${layout}&d=${data}`;
    if (!window.open(url, "_blank")) router.push(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setLayout(readLayout());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>พิมพ์ใบปะหน้าแยก</DialogTitle>
          <DialogDescription>กรอกผู้รับเองได้หลายคน ไม่ผูกกับลูกค้าหรือดีล — ผู้ส่งใช้ข้อมูลจาก ตั้งค่า → ข้อมูลผู้ส่ง</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            print();
          }}
          className="space-y-4"
        >
          <div className="space-y-3">
            {list.map((r, i) => (
              <RecipientCard
                key={r.key}
                r={r}
                index={i}
                canRemove={list.length > 1}
                onChange={(p) => patch(r.key, p)}
                onRemove={() => setList((l) => l.filter((x) => x.key !== r.key))}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            disabled={list.length >= MAX_RECIPIENTS}
            onClick={() => setList((l) => [...l, blank(l.at(-1)?.carrier ?? "")])}
          >
            <UserPlus /> เพิ่มผู้รับ
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
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
            <DialogFooter className="sm:justify-end">
              <Button type="submit">
                <Printer /> พิมพ์ {total} ใบ
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
