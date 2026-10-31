"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { getShipmentFormData, saveShipment } from "@/actions/shipping";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { bangkokDayKey } from "@/lib/deal-stages";
import { trackingLink, trackingLinkPrefills } from "@/lib/provinces";
import { cn } from "@/lib/utils";
import { CarrierSelect, Field, selectCls } from "./fields";

type FormData = Awaited<ReturnType<typeof getShipmentFormData>>;

export type EditableShipment = {
  id: string;
  dealId: string | null;
  carrier: { id: string } | null;
  trackingNo: string | null;
  cost: number | null;
  boxes: number | null;
  shippedAt: Date;
  note: string | null;
};

function buildMessage(o: {
  carrier?: string;
  trackingNo: string;
  boxes: string;
  link: string | null;
  linkPrefilled: boolean;
  branch?: string | null;
  branchPhone?: string | null;
}) {
  const lines = ["📦 แจ้งจัดส่งสินค้าครับ"];
  if (o.carrier) lines.push(`ขนส่ง: ${o.carrier}`);
  if (o.trackingNo.trim()) lines.push(`เลขพัสดุ: ${o.trackingNo.trim()}`);
  if (o.boxes.trim()) lines.push(`จำนวน: ${o.boxes.trim()} กล่อง`);
  if (o.branch) lines.push(`รับของที่: ${o.branch}${o.branchPhone ? ` โทร ${o.branchPhone}` : ""}`);
  if (o.link) lines.push(o.linkPrefilled ? `ติดตามพัสดุ: ${o.link}` : `เช็คสถานะพัสดุ (กรอกเลขพัสดุด้านบน): ${o.link}`);
  lines.push("ขอบคุณที่ใช้บริการครับ 🙏");
  return lines.join("\n");
}

function Form({ data, dealId, shipment, onDone }: { data: FormData; dealId?: string; shipment?: EditableShipment; onDone: () => void }) {
  const c = data.customer!;
  const [carrierId, setCarrierId] = useState(shipment?.carrier?.id ?? c.carrierId ?? "");
  const [deal, setDeal] = useState(shipment?.dealId ?? dealId ?? "");
  const [trackingNo, setTrackingNo] = useState(shipment?.trackingNo ?? "");
  const [cost, setCost] = useState(shipment?.cost != null ? String(shipment.cost) : "");
  const [boxes, setBoxes] = useState(shipment?.boxes != null ? String(shipment.boxes) : "");
  const [date, setDate] = useState(bangkokDayKey(shipment?.shippedAt ?? new Date()));
  const [note, setNote] = useState(shipment?.note ?? "");
  const canNotify = Boolean(c.lineUserId) && c.followStatus !== "UNFOLLOWED";
  const [notify, setNotify] = useState(canNotify && !shipment);
  const [edited, setEdited] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState(!shipment);
  const [followDays, setFollowDays] = useState("3");
  const [pending, start] = useTransition();

  const carrier = data.carriers.find((x) => x.id === carrierId);
  // ปุ่มลัด: ขนส่งหลัก/สำรองของลูกค้า + ขนส่งพัสดุทั่วประเทศ (แฟลช, EMS ฯลฯ)
  const quick = data.carriers
    .filter((x) => x.isActive && (x.id === c.carrierId || x.id === c.backupCarrierId || x.kind === "parcel" || x.kind === "post"))
    .slice(0, 6);
  const branch = carrier && c.province ? carrier.coverage.find((x) => x.province === c.province) : undefined;
  const auto = buildMessage({
    carrier: carrier?.name,
    trackingNo,
    boxes,
    link: trackingLink(carrier?.trackingUrl, trackingNo),
    linkPrefilled: trackingLinkPrefills(carrier?.trackingUrl),
    branch: branch?.branch,
    branchPhone: branch?.phone,
  });
  const message = edited ?? auto;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveShipment(shipment?.id ?? null, {
            customerId: c.id,
            dealId: deal || null,
            carrierId: carrierId || null,
            trackingNo,
            cost,
            boxes,
            shippedAt: date,
            note,
            notify,
            message: notify ? message : null,
            followUpDays: !shipment && followUp ? Math.max(1, Math.min(60, Number(followDays) || 3)) : null,
          });
          if (r.ok) {
            toast.success(r.message);
            onDone();
          } else toast.error(r.error, { duration: 10000 });
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ขนส่ง" htmlFor="s-carrier" className="sm:col-span-2" hint={data.carriers.length === 0 ? "ยังไม่มีขนส่ง — เพิ่มได้ที่เมนูขนส่ง" : undefined}>
          <div className="space-y-2">
            {/* ปุ่มลัด: ขนส่งพัสดุ/ไปรษณีย์ + ขนส่งที่ลูกค้าใช้ */}
            <div className="flex flex-wrap gap-1.5">
              {quick.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCarrierId(q.id)}
                  aria-pressed={carrierId === q.id}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    carrierId === q.id ? "border-primary bg-primary-soft font-medium text-primary" : "hover:bg-accent",
                  )}
                >
                  {q.name}
                </button>
              ))}
            </div>
            <CarrierSelect id="s-carrier" value={carrierId} onChange={setCarrierId} carriers={data.carriers} province={c.province} />
            {carrier?.trackingUrl && (
              <a href={trackingLink(carrier.trackingUrl, trackingNo) ?? carrier.trackingUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">
                เว็บเช็คพัสดุ: {carrier.trackingUrl}
              </a>
            )}
          </div>
        </Field>
        <Field label="เลขพัสดุ" htmlFor="s-track" className="sm:col-span-2">
          <Input id="s-track" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="เช่น NX123456789TH" autoFocus />
        </Field>
        <Field label="ค่าส่ง (บาท)" htmlFor="s-cost">
          <Input id="s-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
        </Field>
        <Field label="จำนวนกล่อง" htmlFor="s-boxes">
          <Input id="s-boxes" inputMode="numeric" value={boxes} onChange={(e) => setBoxes(e.target.value)} placeholder="1" />
        </Field>
        <Field label="วันที่ส่ง" htmlFor="s-date">
          <Input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="ดีลที่เกี่ยวข้อง" htmlFor="s-deal">
          <select id="s-deal" value={deal} onChange={(e) => setDeal(e.target.value)} className={selectCls}>
            <option value="">— ไม่ระบุ —</option>
            {data.deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="หมายเหตุ (ภายใน)" htmlFor="s-note" className="sm:col-span-2">
          <Input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ฝากท้ายรถรอบ 17:00" />
        </Field>
      </div>

      {canNotify ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-primary" />
            <Send className="size-3.5" /> ส่งเลขพัสดุให้ลูกค้าทาง LINE
          </label>
          {notify && (
            <>
              <Textarea rows={6} value={message} onChange={(e) => setEdited(e.target.value)} aria-label="ข้อความถึงลูกค้า" />
              {edited !== null && (
                <button type="button" onClick={() => setEdited(null)} className="text-xs text-primary hover:underline">
                  ใช้ข้อความอัตโนมัติ
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">ลูกค้ารายนี้ไม่มี LINE หรือบล็อก OA — บันทึกได้แต่ส่งข้อความไม่ได้</p>
      )}

      {!shipment && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="size-4 accent-primary" />
          เตือนให้ถามลูกค้าว่าได้รับของหลังส่ง
          <Input
            type="number"
            min={1}
            max={60}
            value={followDays}
            onChange={(e) => setFollowDays(e.target.value)}
            disabled={!followUp}
            className="h-8 w-16"
            aria-label="จำนวนวัน"
          />
          วัน
        </label>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {notify ? "บันทึกและส่งให้ลูกค้า" : "บันทึก"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ShipmentDialog({
  customerId,
  dealId,
  shipment,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  customerId: string;
  dealId?: string;
  shipment?: EditableShipment;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [data, setData] = useState<FormData | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getShipmentFormData(customerId).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [open, customerId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{shipment ? "แก้ไขการส่งของ" : "บันทึกการส่งของ"}</DialogTitle>
          <DialogDescription>
            {data?.customer ? `ลูกค้า: ${data.customer.fullName || data.customer.lineName || "ไม่ระบุชื่อ"}${data.customer.province ? ` · ${data.customer.province}` : ""}` : "กำลังโหลด…"}
          </DialogDescription>
        </DialogHeader>
        {open && data?.customer ? (
          <Form key={shipment?.id ?? "new"} data={data} dealId={dealId} shipment={shipment} onDone={() => setOpen(false)} />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-24" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
