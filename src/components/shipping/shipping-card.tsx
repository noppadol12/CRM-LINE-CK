"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MapPin, PackageCheck, Pencil, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { getShipmentFormData, updateCustomerShipping } from "@/actions/shipping";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trackingLink } from "@/lib/provinces";
import { cn } from "@/lib/utils";
import { CarrierSelect, Field, ProvinceSelect } from "./fields";
import { ShipmentDialog } from "./shipment-dialog";

export type CustomerShippingInfo = {
  id: string;
  province: string | null;
  shippingNote: string | null;
  carrier: { id: string; name: string } | null;
  backupCarrier: { id: string; name: string } | null;
};

export type ShipmentSummary = {
  id: string;
  trackingNo: string | null;
  shippedAt: Date;
  cost: number | null;
  notifiedAt: Date | null;
  carrier: { id: string; name: string; trackingUrl: string | null } | null;
};

const dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });

function InfoDialog({ customer, open, onOpenChange }: { customer: CustomerShippingInfo; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [carriers, setCarriers] = useState<Awaited<ReturnType<typeof getShipmentFormData>>["carriers"] | null>(null);
  const [province, setProvince] = useState(customer.province ?? "");
  const [carrierId, setCarrierId] = useState(customer.carrier?.id ?? "");
  const [backupId, setBackupId] = useState(customer.backupCarrier?.id ?? "");
  const [note, setNote] = useState(customer.shippingNote ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getShipmentFormData(customer.id).then((d) => alive && setCarriers(d.carriers));
    return () => {
      alive = false;
    };
  }, [open, customer.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ข้อมูลจัดส่ง</DialogTitle>
          <DialogDescription>เลือกจังหวัดก่อน รายการขนส่งจะแสดงเจ้าที่ไปจังหวัดนั้นขึ้นก่อน</DialogDescription>
        </DialogHeader>
        {!carriers ? (
          <Skeleton className="h-48" />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await updateCustomerShipping(customer.id, { province, carrierId, backupCarrierId: backupId, shippingNote: note });
                if (r.ok) {
                  toast.success(r.message);
                  onOpenChange(false);
                } else toast.error(r.error);
              });
            }}
            className="space-y-4"
          >
            <Field label="จังหวัด" htmlFor="sh-province">
              <ProvinceSelect id="sh-province" value={province} onChange={setProvince} />
            </Field>
            <Field label="ขนส่งหลัก" htmlFor="sh-carrier" hint={carriers.length === 0 ? "ยังไม่มีขนส่งในระบบ — เพิ่มได้ที่เมนูขนส่ง" : undefined}>
              <CarrierSelect id="sh-carrier" value={carrierId} onChange={setCarrierId} carriers={carriers} province={province} />
            </Field>
            <Field label="ขนส่งสำรอง" htmlFor="sh-backup">
              <CarrierSelect id="sh-backup" value={backupId} onChange={setBackupId} carriers={carriers.filter((c) => c.id !== carrierId)} province={province} />
            </Field>
            <Field label="หมายเหตุการจัดส่ง" htmlFor="sh-note">
              <Textarea id="sh-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น รับที่ท่ารถหาดใหญ่ โทรแจ้งก่อนส่ง" maxLength={500} />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** สรุปการจัดส่งของลูกค้า — ใช้ในหน้าลูกค้าและข้างห้องแชท */
export function ShippingCard({ customer, shipments, compact }: { customer: CustomerShippingInfo; shipments: ShipmentSummary[]; compact?: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const empty = !customer.province && !customer.carrier && !customer.shippingNote;
  const last = shipments[0];

  return (
    <div className={cn("space-y-2", !compact && "rounded-xl border bg-card p-5")}>
      <div className="flex items-center justify-between">
        <p className={cn("flex items-center gap-1.5 font-medium", compact ? "text-xs text-muted-foreground" : "text-sm")}>
          <Truck className="size-3.5" /> การจัดส่ง
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="แก้ไขข้อมูลจัดส่ง" onClick={() => setEditOpen(true)}>
            <Pencil />
          </Button>
          <ShipmentDialog
            customerId={customer.id}
            trigger={
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                <Plus /> บันทึกการส่ง
              </Button>
            }
          />
        </div>
      </div>

      {empty ? (
        <button type="button" onClick={() => setEditOpen(true)} className="w-full rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground hover:bg-accent">
          ระบุจังหวัดและขนส่งที่ลูกค้าใช้
        </button>
      ) : (
        <dl className="space-y-1.5 rounded-lg border bg-card p-3 text-sm">
          {customer.province && (
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <Link href={`/shipping/provinces/${encodeURIComponent(customer.province)}`} className="hover:underline">
                {customer.province}
              </Link>
            </div>
          )}
          {customer.carrier && (
            <div className="flex items-center gap-2">
              <Truck className="size-3.5 shrink-0 text-muted-foreground" />
              <Link href={`/shipping/carriers/${customer.carrier.id}`} className="font-medium hover:underline">
                {customer.carrier.name}
              </Link>
              {customer.backupCarrier && <span className="truncate text-xs text-muted-foreground">สำรอง: {customer.backupCarrier.name}</span>}
            </div>
          )}
          {customer.shippingNote && <p className="text-xs whitespace-pre-wrap text-muted-foreground">{customer.shippingNote}</p>}
        </dl>
      )}

      {shipments.length > 0 && (
        <ul className="space-y-1">
          {(compact ? shipments.slice(0, 2) : shipments).map((s) => {
            const link = trackingLink(s.carrier?.trackingUrl, s.trackingNo);
            return (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <PackageCheck className={cn("size-3.5 shrink-0", s.notifiedAt ? "text-primary" : "text-muted-foreground")} />
                <span className="shrink-0 text-muted-foreground">{dateFmt.format(s.shippedAt)}</span>
                <span className="truncate">{s.carrier?.name ?? "ไม่ระบุขนส่ง"}</span>
                {s.trackingNo &&
                  (link ? (
                    <a href={link} target="_blank" rel="noreferrer" className="ml-auto shrink-0 font-mono text-primary hover:underline">
                      {s.trackingNo}
                    </a>
                  ) : (
                    <span className="ml-auto shrink-0 font-mono">{s.trackingNo}</span>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
      {!compact && last == null && <p className="text-xs text-muted-foreground">ยังไม่มีประวัติการส่งของ</p>}

      {editOpen && <InfoDialog customer={customer} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  );
}
