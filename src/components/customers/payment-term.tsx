"use client";

import { useState, useTransition } from "react";
import { Banknote, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { setPaymentTerm } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CREDIT_DAY_PRESETS, PAYMENT_TERMS, PAYMENT_TERM_IDS, isPaymentTerm, paymentTermLabel, type PaymentTerm } from "@/lib/payment-terms";
import { cn } from "@/lib/utils";

export type PaymentInfo = { paymentTerm: string | null; creditDays: number | null; paymentNote: string | null };

/** ป้ายเงื่อนไขชำระเงิน — ไม่แสดงอะไรถ้ายังไม่ได้ระบุ */
export function PaymentTermBadge({ term, days, short, className }: { term: string | null; days?: number | null; short?: boolean; className?: string }) {
  if (!isPaymentTerm(term)) return null;
  return (
    <span
      title={paymentTermLabel(term, days) ?? undefined}
      className={cn("inline-flex shrink-0 items-center rounded border px-1.5 py-px text-[11px] leading-4 font-medium whitespace-nowrap", PAYMENT_TERMS[term].chip, className)}
    >
      {paymentTermLabel(term, days, { short })}
    </span>
  );
}

function EditDialog({ customerId, info, open, onOpenChange }: { customerId: string; info: PaymentInfo; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [term, setTerm] = useState<PaymentTerm | "">(isPaymentTerm(info.paymentTerm) ? info.paymentTerm : "");
  const [days, setDays] = useState(info.creditDays ? String(info.creditDays) : "");
  const [note, setNote] = useState(info.paymentNote ?? "");
  const [pending, start] = useTransition();
  const needsDays = term === "credit" || term === "pdc";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เงื่อนไขการชำระเงิน</DialogTitle>
          <DialogDescription>ทีมจะเห็นในหน้าแชท ก่อนตอบลูกค้าเรื่องราคาและการส่งของ</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await setPaymentTerm(customerId, { term: term || null, days, note });
              if (r.ok) {
                toast.success(r.message);
                onOpenChange(false);
              } else toast.error(r.error);
            });
          }}
        >
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="ประเภทการชำระ">
            {PAYMENT_TERM_IDS.map((id) => {
              const t = PAYMENT_TERMS[id];
              const on = term === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTerm(on ? "" : id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-sm transition-colors",
                    on ? "border-primary bg-primary-soft font-medium text-primary-soft-foreground" : "hover:bg-accent",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", t.dot)} />
                  {t.label}
                </button>
              );
            })}
          </div>
          {term && <p className="-mt-2 text-xs text-muted-foreground">{PAYMENT_TERMS[term].hint}</p>}

          {needsDays && (
            <div className="space-y-2">
              <label htmlFor="pt-days" className="text-sm font-medium">
                {term === "pdc" ? "เช็คลงวันที่ล่วงหน้า (วัน)" : "เครดิต (วัน)"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CREDIT_DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(String(d))}
                    aria-pressed={days === String(d)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs tabular-nums transition-colors",
                      days === String(d) ? "border-primary bg-primary-soft font-medium text-primary" : "hover:bg-accent",
                    )}
                  >
                    {d} วัน
                  </button>
                ))}
              </div>
              <Input id="pt-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} placeholder="หรือพิมพ์จำนวนวัน" className="w-40" />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="pt-note" className="text-sm font-medium">
              หมายเหตุ
            </label>
            <Input id="pt-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เช่น วงเงิน 50,000 · วางบิลทุกวันที่ 25" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** การ์ดเงื่อนไขชำระเงิน — ใช้ข้างห้องแชทและหน้าลูกค้า */
export function PaymentTermCard({ customerId, info, canEdit, compact }: { customerId: string; info: PaymentInfo; canEdit: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const set = isPaymentTerm(info.paymentTerm);

  return (
    <div className={cn("space-y-1.5", !compact && "rounded-xl border bg-card p-5")}>
      <div className="flex items-center justify-between">
        <p className={cn("flex items-center gap-1.5 font-medium", compact ? "text-xs text-muted-foreground" : "text-sm")}>
          <Banknote className="size-3.5" /> การชำระเงิน
        </p>
        {canEdit && set && (
          <Button variant="ghost" size="icon-sm" aria-label="แก้ไขเงื่อนไขการชำระเงิน" onClick={() => setOpen(true)}>
            <Pencil />
          </Button>
        )}
      </div>
      {set ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <PaymentTermBadge term={info.paymentTerm} days={info.creditDays} className="px-2 py-0.5 text-sm" />
          {info.paymentNote && <p className="min-w-0 basis-full text-xs break-words text-muted-foreground">{info.paymentNote}</p>}
        </div>
      ) : canEdit ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground hover:bg-accent"
        >
          ระบุ เงินสด / เครดิต / โพสต์เดตเช็ค
        </button>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">ยังไม่ระบุ</p>
      )}
      {open && <EditDialog customerId={customerId} info={info} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
