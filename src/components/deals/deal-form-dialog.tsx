"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { createDeal, searchCustomers, updateDeal, type DealFormState } from "@/actions/deals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LOST, bangkokDayKey } from "@/lib/deal-stages";
import { useStages } from "./stages-context";
import type { DealDTO } from "@/lib/deals";
import { cn } from "@/lib/utils";

export type Owner = { id: string; name: string };
type CustomerOption = { id: string; name: string; company?: string | null };

const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** ช่องเลือกลูกค้าแบบค้นหา */
function CustomerPicker({ value, onChange, error }: { value: CustomerOption | null; onChange: (c: CustomerOption | null) => void; error?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const rows = await searchCustomers(q);
      if (!cancelled) {
        setResults(rows);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, value]);

  if (value) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
        <span className="min-w-0 flex-1 truncate font-medium">
          {value.name}
          {value.company && <span className="font-normal text-muted-foreground"> · {value.company}</span>}
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="เปลี่ยนลูกค้า" className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="relative flex items-center">
        {loading ? (
          <Loader2 className="pointer-events-none absolute left-3 size-4 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        )}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ บริษัท เบอร์โทร" className="pl-9" aria-invalid={!!error} autoFocus />
      </label>
      <ul className="max-h-40 overflow-y-auto rounded-md border">
        {results.length === 0 && !loading && <li className="px-3 py-2 text-sm text-muted-foreground">ไม่พบลูกค้า</li>}
        {results.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onChange(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-accent">
              {c.name}
              {c.company && <span className="text-muted-foreground"> · {c.company}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DealFormDialog({
  trigger,
  deal,
  customer,
  owners,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  deal?: DealDTO;
  /** ลูกค้าที่เลือกไว้ล่วงหน้า (เปิดจากหน้าลูกค้า / ห้องแชท) */
  customer?: CustomerOption;
  owners: Owner[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{deal ? "แก้ไขดีล" : "สร้างดีลใหม่"}</DialogTitle>
          <DialogDescription>บันทึกสิ่งที่ลูกค้าสนใจ มูลค่า และวันนัดติดตาม เพื่อไม่ให้ลูกค้าหลุด</DialogDescription>
        </DialogHeader>
        <DealForm deal={deal} customer={customer} owners={owners} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DealForm({ deal, customer, owners, onDone }: { deal?: DealDTO; customer?: CustomerOption; owners: Owner[]; onDone: () => void }) {
  const action = deal ? updateDeal.bind(null, deal.id) : createDeal;
  const [state, formAction, pending] = useActionState<DealFormState, FormData>(action, undefined);
  const [picked, setPicked] = useState<CustomerOption | null>(
    deal ? { id: deal.customer.id, name: deal.customer.fullName || deal.customer.lineName || "ลูกค้า" } : (customer ?? null),
  );
  const stages = useStages();
  const [stage, setStage] = useState<string>(deal?.stage ?? stages[0]?.id ?? "");
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const handled = useRef<DealFormState>(undefined);
  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(state.message ?? "บันทึกแล้ว");
      onDone();
    } else if (!state.fieldErrors) toast.error(state.error);
  }, [state, onDone]);

  const day = (d: Date | null | undefined) => (d ? bangkokDayKey(d) : "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="customerId" value={picked?.id ?? ""} />
      <Field label="ลูกค้า" error={fe?.customerId} className="sm:col-span-2">
        {customer && !deal ? (
          <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">{customer.name}</div>
        ) : (
          <CustomerPicker value={picked} onChange={setPicked} error={fe?.customerId} />
        )}
      </Field>

      <Field label="ชื่อดีล" error={fe?.title} className="sm:col-span-2">
        <Input name="title" defaultValue={deal?.title} placeholder="เช่น Expansion valve TEX2 x3" aria-invalid={!!fe?.title} autoFocus={Boolean(customer || deal)} />
      </Field>

      <Field label="สินค้า / รายละเอียด" error={fe?.items} className="sm:col-span-2">
        <Textarea name="items" rows={2} defaultValue={deal?.items ?? ""} placeholder="รุ่น ขนาด จำนวน หรือสเปกที่ลูกค้าถาม" />
      </Field>

      <Field label="มูลค่า (บาท)" error={fe?.amount}>
        <Input name="amount" inputMode="decimal" defaultValue={deal?.amount ?? ""} placeholder="0" aria-invalid={!!fe?.amount} />
      </Field>
      <Field label="ขั้น">
        <select name="stage" value={stage} onChange={(e) => setStage(e.target.value)} className={selectCls}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      {stage === LOST && (
        <Field label="เหตุผลที่ไม่ซื้อ" error={fe?.lostReason} className="sm:col-span-2">
          <Input name="lostReason" defaultValue={deal?.lostReason ?? ""} placeholder="เช่น ราคาสูงกว่าร้านอื่น, ไม่มีของ, ลูกค้าเงียบ" aria-invalid={!!fe?.lostReason} />
        </Field>
      )}

      <Field label="นัดติดตาม" error={fe?.nextFollowUpAt}>
        <Input name="nextFollowUpAt" type="date" defaultValue={day(deal?.nextFollowUpAt)} />
      </Field>
      <Field label="เลขที่ใบเสนอราคา" error={fe?.quoteNo}>
        <Input name="quoteNo" defaultValue={deal?.quoteNo ?? ""} placeholder="QT2026-0001" />
      </Field>
      <Field label="คาดว่าจะปิดการขาย" error={fe?.expectedCloseDate}>
        <Input name="expectedCloseDate" type="date" defaultValue={day(deal?.expectedCloseDate)} />
      </Field>
      <Field label="ผู้ดูแล">
        <select name="ownerId" defaultValue={deal?.owner?.id ?? ""} className={selectCls}>
          <option value="">{deal ? "ไม่ระบุ" : "ฉัน (ค่าเริ่มต้น)"}</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {deal ? "บันทึก" : "สร้างดีล"}
        </Button>
      </DialogFooter>
    </form>
  );
}
