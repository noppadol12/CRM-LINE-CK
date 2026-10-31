"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AlarmClock, Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, setTaskDone } from "@/actions/tasks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { displayName } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { TaskDialog } from "./task-dialog";

export type TaskItem = {
  id: string;
  title: string;
  note: string | null;
  dueAt: Date;
  doneAt: Date | null;
  customer: { id: string; fullName: string | null; lineName: string | null; lineUserId: string | null } | null;
  deal: { id: string; title: string } | null;
  assignee: { id: string; name: string } | null;
};

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" });

function dueLabel(d: Date, now: number) {
  const k = dayKey.format(d);
  const today = dayKey.format(now);
  const tomorrow = dayKey.format(now + 86_400_000);
  const late = d.getTime() < now;
  const text = k === today ? `วันนี้ ${timeFmt.format(d)}` : k === tomorrow ? `พรุ่งนี้ ${timeFmt.format(d)}` : `${dateFmt.format(d)} ${timeFmt.format(d)}`;
  return { text, late };
}

function Row({ t, now, showCustomer, onToggle }: { t: TaskItem; now: number; showCustomer: boolean; onToggle: (done: boolean) => void }) {
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const due = dueLabel(t.dueAt, now);
  const done = Boolean(t.doneAt);

  return (
    <li className="group flex items-start gap-3 px-4 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `ยกเลิกเสร็จ ${t.title}` : `ทำเสร็จ ${t.title}`}
        onClick={() => onToggle(!done)}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {done && <Check className="size-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", done ? "text-muted-foreground line-through" : "font-medium")}>{t.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className={cn("inline-flex items-center gap-1", !done && due.late && "font-medium text-rose-600")}>
            <AlarmClock className="size-3" />
            {due.text}
            {!done && due.late && " · เลยกำหนด"}
          </span>
          {showCustomer && t.customer && (
            <Link href={t.customer.lineUserId ? `/chats?c=${t.customer.id}` : `/customers/${t.customer.id}`} className="truncate hover:text-foreground hover:underline">
              {displayName(t.customer)}
            </Link>
          )}
          {t.deal && <span className="truncate">ดีล: {t.deal.title}</span>}
        </p>
        {t.note && <p className="mt-0.5 text-xs text-muted-foreground">{t.note}</p>}
      </div>
      {t.assignee && (
        <span title={`ผู้รับผิดชอบ: ${t.assignee.name}`} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-medium text-primary-soft-foreground">
          {initials(t.assignee.name)}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="-my-1 size-7" aria-label={`เมนูงาน ${t.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil /> แก้ไข / เลื่อนเวลา
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
            <Trash2 /> ลบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {edit && <TaskDialog task={t} open onOpenChange={setEdit} />}
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title={`ลบงาน "${t.title}"?`}
        confirmLabel="ลบ"
        onConfirm={async () => {
          const r = await deleteTask(t.id);
          if (!r.ok) toast.error(r.error);
        }}
      />
    </li>
  );
}

/** รายการงาน — ติ๊กเสร็จได้ทันที (optimistic) */
export function TaskList({ tasks, showCustomer = true, empty }: { tasks: TaskItem[]; showCustomer?: boolean; empty?: string }) {
  const [now] = useState(() => Date.now());
  const [list, setOptimistic] = useOptimistic(tasks, (state, u: { id: string; done: boolean }) =>
    state.map((t) => (t.id === u.id ? { ...t, doneAt: u.done ? new Date() : null } : t)),
  );
  const [, start] = useTransition();

  if (list.length === 0) return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{empty ?? "ไม่มีงาน"}</p>;
  return (
    <ul className="divide-y">
      {list.map((t) => (
        <Row
          key={t.id}
          t={t}
          now={now}
          showCustomer={showCustomer}
          onToggle={(done) =>
            start(async () => {
              setOptimistic({ id: t.id, done });
              const r = await setTaskDone(t.id, done);
              if (!r.ok) toast.error(r.error);
              else if (done) toast.success("ทำเสร็จแล้ว ✓", { duration: 1500 });
            })
          }
        />
      ))}
    </ul>
  );
}
