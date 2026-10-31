"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTaskFormData, saveTask } from "@/actions/tasks";
import { CustomerPicker, type CustomerOption } from "@/components/deals/deal-form-dialog";
import { Field, selectCls } from "@/components/shipping/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type EditableTask = {
  id: string;
  title: string;
  note: string | null;
  dueAt: Date;
  customer: { id: string; fullName: string | null; lineName: string | null } | null;
  deal: { id: string } | null;
  assignee: { id: string } | null;
};

const localParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
/** Date → ค่า datetime-local ตามเวลาไทย */
function toLocal(d: Date) {
  const p = Object.fromEntries(localParts.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** วันที่ (เวลาไทย) + n วัน เวลา hh:mm */
function dayAt(addDays: number, hh: number, mm = 0) {
  const today = toLocal(new Date()).slice(0, 10);
  const base = new Date(`${today}T00:00:00+07:00`).getTime() + addDays * 86_400_000;
  return toLocal(new Date(base + (hh * 60 + mm) * 60_000));
}

const PRESETS: { label: string; value: () => string }[] = [
  { label: "อีก 1 ชม.", value: () => toLocal(new Date(Date.now() + 3_600_000)) },
  { label: "พรุ่งนี้ 10:00", value: () => dayAt(1, 10) },
  { label: "อีก 3 วัน", value: () => dayAt(3, 10) },
  { label: "สัปดาห์หน้า", value: () => dayAt(7, 10) },
];

function Form({
  task,
  customer,
  dealId,
  defaultTitle,
  data,
  onDone,
}: {
  task?: EditableTask;
  customer?: CustomerOption;
  dealId?: string;
  defaultTitle?: string;
  data: Awaited<ReturnType<typeof getTaskFormData>>;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? defaultTitle ?? "");
  const [due, setDue] = useState(task ? toLocal(task.dueAt) : dayAt(1, 10));
  const [note, setNote] = useState(task?.note ?? "");
  const [assignee, setAssignee] = useState(task?.assignee?.id ?? data.me);
  const [deal, setDeal] = useState(task?.deal?.id ?? dealId ?? "");
  const [picked, setPicked] = useState<CustomerOption | null>(
    task?.customer ? { id: task.customer.id, name: task.customer.fullName || task.customer.lineName || "ลูกค้า" } : (customer ?? null),
  );
  const [pending, start] = useTransition();
  const fixedCustomer = Boolean(customer && !task);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveTask(task?.id ?? null, {
            title,
            note,
            dueAt: due,
            customerId: picked?.id ?? null,
            dealId: picked ? deal || null : null,
            assigneeId: assignee,
          });
          if (r.ok) {
            toast.success(r.message);
            onDone();
          } else toast.error(r.error);
        });
      }}
      className="space-y-4"
    >
      <Field label="ต้องทำอะไร" htmlFor="t-title">
        <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น โทรกลับเรื่องราคาคอมเพรสเซอร์" maxLength={200} autoFocus required />
      </Field>
      <Field label="เตือนเมื่อ" htmlFor="t-due">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const v = p.value();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDue(v)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs hover:bg-accent", due === v && "border-primary bg-primary-soft text-primary")}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <Input id="t-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} required />
        </div>
      </Field>
      {!fixedCustomer && (
        <Field label="ลูกค้า (ไม่บังคับ)">
          <CustomerPicker value={picked} onChange={setPicked} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ผู้รับผิดชอบ" htmlFor="t-assignee">
          <select id="t-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selectCls}>
            {data.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === data.me ? `${m.name} (ฉัน)` : m.name}
              </option>
            ))}
          </select>
        </Field>
        {data.deals.length > 0 && (
          <Field label="ดีลที่เกี่ยวข้อง" htmlFor="t-deal">
            <select id="t-deal" value={deal} onChange={(e) => setDeal(e.target.value)} className={selectCls}>
              <option value="">— ไม่ระบุ —</option>
              {data.deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label="รายละเอียด (ไม่บังคับ)" htmlFor="t-note">
        <Input id="t-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || !title.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          {task ? "บันทึก" : "เพิ่มงาน"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TaskDialog({
  task,
  customer,
  dealId,
  defaultTitle,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  task?: EditableTask;
  customer?: CustomerOption;
  dealId?: string;
  defaultTitle?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [data, setData] = useState<Awaited<ReturnType<typeof getTaskFormData>> | null>(null);
  const customerId = task?.customer?.id ?? customer?.id ?? null;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getTaskFormData(customerId).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [open, customerId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "แก้ไขงาน" : "เพิ่มงานติดตาม"}</DialogTitle>
          <DialogDescription>{customer && !task ? `ลูกค้า: ${customer.name} · ` : ""}ระบบจะแจ้งเตือนเข้ามือถือ/คอมของผู้รับผิดชอบเมื่อถึงเวลา</DialogDescription>
        </DialogHeader>
        {open && data ? (
          <Form task={task} customer={customer} dealId={dealId} defaultTitle={defaultTitle} data={data} onDone={() => setOpen(false)} />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-16" />
            <Skeleton className="h-9" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
