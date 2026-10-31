"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addCoverage, removeCoverage, saveCoverage } from "@/actions/shipping";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { REGIONS, regionOf } from "@/lib/provinces";
import { cn } from "@/lib/utils";

type Row = { province: string; branch: string | null; phone: string | null; transitDays: string | null; note: string | null };

function PickProvinces({ open, onOpenChange, carrierId, existing }: { open: boolean; onOpenChange: (o: boolean) => void; carrierId: string; existing: Set<string> }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toggle = (p: string) => setPicked((s) => (s.has(p) ? (s.delete(p), new Set(s)) : new Set(s.add(p))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>เพิ่มจังหวัดที่ไป</DialogTitle>
          <DialogDescription>ติ๊กได้หลายจังหวัด หรือกดชื่อภาคเพื่อเลือกทั้งภาค (จังหวัดที่มีอยู่แล้วเลือกไม่ได้)</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60svh] space-y-4 overflow-y-auto pr-1">
          {REGIONS.map((r) => {
            const available = r.provinces.filter((p) => !existing.has(p));
            const allPicked = available.length > 0 && available.every((p) => picked.has(p));
            return (
              <section key={r.key} className="space-y-2">
                <button
                  type="button"
                  disabled={available.length === 0}
                  onClick={() =>
                    setPicked((s) => {
                      const n = new Set(s);
                      available.forEach((p) => (allPicked ? n.delete(p) : n.add(p)));
                      return n;
                    })
                  }
                  className="text-sm font-semibold hover:text-primary disabled:text-muted-foreground"
                >
                  {r.name} {available.length > 0 && <span className="text-xs font-normal text-primary">{allPicked ? "ยกเลิกทั้งภาค" : "เลือกทั้งภาค"}</span>}
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {r.provinces.map((p) => {
                    const has = existing.has(p);
                    const on = picked.has(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={has}
                        onClick={() => toggle(p)}
                        aria-pressed={on}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          has ? "border-transparent bg-muted text-muted-foreground line-through" : on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            disabled={picked.size === 0 || pending}
            onClick={() =>
              start(async () => {
                const r = await addCoverage(carrierId, [...picked]);
                if (r.ok) {
                  toast.success(r.message);
                  setPicked(new Set());
                  onOpenChange(false);
                } else toast.error(r.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            เพิ่ม {picked.size > 0 ? `${picked.size} จังหวัด` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowEditor({ carrierId, row, onDone }: { carrierId: string; row: Row; onDone: () => void }) {
  const [v, setV] = useState({ branch: row.branch ?? "", phone: row.phone ?? "", transitDays: row.transitDays ?? "", note: row.note ?? "" });
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2 bg-muted/30 px-5 py-3 sm:grid-cols-[1fr_9rem_7rem]">
      <Input value={v.branch} onChange={(e) => setV({ ...v, branch: e.target.value })} placeholder="สาขา/ท่ารถปลายทาง" autoFocus />
      <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder="เบอร์สาขา" />
      <Input value={v.transitDays} onChange={(e) => setV({ ...v, transitDays: e.target.value })} placeholder="เช่น 1-2 วัน" />
      <Input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="หมายเหตุ เช่น ส่งถึงหน้าร้านได้" className="sm:col-span-2" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDone} disabled={pending}>
          ยกเลิก
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveCoverage(carrierId, row.province, v);
              if (r.ok) {
                toast.success(r.message);
                onDone();
              } else toast.error(r.error);
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />}
          บันทึก
        </Button>
      </div>
    </div>
  );
}

export function CoverageManager({ carrierId, coverage }: { carrierId: string; coverage: Row[] }) {
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();
  const existing = new Set(coverage.map((c) => c.province));

  return (
    <div>
      <div className="border-b px-5 py-3">
        <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
          <Plus /> เพิ่มจังหวัด
        </Button>
      </div>
      {coverage.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่ได้ระบุจังหวัด</p>}
      <ul className="divide-y">
        {coverage.map((r) =>
          editing === r.province ? (
            <li key={r.province}>
              <p className="px-5 pt-3 text-sm font-medium">{r.province}</p>
              <RowEditor carrierId={carrierId} row={r} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={r.province} className="group flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/shipping/provinces/${encodeURIComponent(r.province)}`} className="font-medium hover:underline">
                    {r.province}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{regionOf(r.province)?.name}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[r.branch, r.phone, r.transitDays, r.note].filter(Boolean).join(" · ") || (
                    <button type="button" onClick={() => setEditing(r.province)} className="text-primary hover:underline">
                      + ระบุสาขาปลายทาง
                    </button>
                  )}
                </p>
              </div>
              <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <Button variant="ghost" size="icon-sm" aria-label={`แก้ไข ${r.province}`} onClick={() => setEditing(r.province)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`นำ ${r.province} ออก`}
                  className="hover:text-destructive"
                  onClick={() =>
                    start(async () => {
                      const res = await removeCoverage(carrierId, r.province);
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.error);
                    })
                  }
                >
                  <X />
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
      <PickProvinces key={coverage.length} open={picking} onOpenChange={setPicking} carrierId={carrierId} existing={existing} />
    </div>
  );
}
