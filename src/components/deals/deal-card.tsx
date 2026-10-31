"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRightLeft, CalendarClock, FileText, MessagesSquare, MoreHorizontal, Pencil, Trash2, Truck } from "lucide-react";
import { ShipmentDialog } from "@/components/shipping/shipment-dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { toast } from "sonner";
import { deleteDeal, moveDealStage } from "@/actions/deals";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LOST, baht, findStage, followUpState, isClosedStage, stageStyle } from "@/lib/deal-stages";
import { useStages } from "./stages-context";
import type { DealDTO } from "@/lib/deals";
import { displayName } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { DealFormDialog, type Owner } from "./deal-form-dialog";

const shortDate = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });

export function FollowUpBadge({ date, closed }: { date: Date | null; closed?: boolean }) {
  if (!date || closed) return null;
  const state = followUpState(date);
  const tone = state === "overdue" ? "bg-rose-50 text-rose-700" : state === "today" ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground";
  const label = state === "overdue" ? `เลยนัด ${shortDate.format(date)}` : state === "today" ? "ติดตามวันนี้" : `นัด ${shortDate.format(date)}`;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", tone)}>
      <CalendarClock className="size-3" />
      {label}
    </span>
  );
}

/** ถามเหตุผลก่อนย้ายไป "ไม่ซื้อ" */
export function LostReasonDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ลูกค้าไม่ซื้อเพราะอะไร?</DialogTitle>
          <DialogDescription>ใช้ดูสาเหตุที่เสียลูกค้าในรายงานภายหลัง</DialogDescription>
        </DialogHeader>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ราคาสูงกว่าร้านอื่น, ไม่มีของ, ลูกค้าเงียบ" autoFocus />
        <div className="flex flex-wrap gap-1.5">
          {["ราคาสูงกว่าร้านอื่น", "ไม่มีของ / รอนาน", "ลูกค้าเงียบ", "ซื้อที่อื่นแล้ว"].map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent">
              {r}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || pending}
            onClick={() =>
              start(async () => {
                await onSubmit(reason.trim());
                setReason("");
              })
            }
          >
            ย้ายไป &quot;ไม่ซื้อ&quot;
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DealCard({
  deal,
  owners,
  canManage,
  showCustomer = true,
  onMove,
  draggable,
}: {
  deal: DealDTO;
  owners: Owner[];
  canManage: boolean;
  showCustomer?: boolean;
  /** บอร์ดส่งฟังก์ชันย้ายแบบ optimistic มาให้ ถ้าไม่มีจะเรียก action ตรง */
  onMove?: (stage: string, lostReason?: string) => void;
  draggable?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const stages = useStages();
  const closed = isClosedStage(deal.stage);
  const current = findStage(stages, deal.stage);
  const customerName = displayName(deal.customer);

  async function move(stage: string, reason?: string) {
    if (onMove) return onMove(stage, reason);
    const r = await moveDealStage(deal.id, stage, reason);
    if (!r.ok) toast.error(r.error);
  }

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/deal-id", deal.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group rounded-lg border bg-card p-3 text-sm shadow-xs transition-shadow hover:shadow-sm",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => setEditOpen(true)} className="min-w-0 flex-1 text-left">
          <p className="line-clamp-2 font-medium">{deal.title}</p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1 size-7" aria-label={`เมนูดีล ${deal.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              แก้ไข
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
              <AlarmClock />
              เพิ่มงานติดตาม
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShipOpen(true)}>
              <Truck />
              บันทึกการส่งของ
            </DropdownMenuItem>
            {deal.customer.lineUserId && (
              <DropdownMenuItem asChild>
                <Link href={`/chats?c=${deal.customer.id}`}>
                  <MessagesSquare />
                  เปิดแชท
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowRightLeft className="size-3" /> ย้ายไป
            </DropdownMenuLabel>
            {stages
              .filter((s) => s.id !== deal.stage)
              .map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => (s.id === LOST ? setLostOpen(true) : void move(s.id))}>
                  <span className={cn("size-2 rounded-full", stageStyle(s.color).dot)} />
                  {s.name}
                </DropdownMenuItem>
              ))}
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                  <Trash2 />
                  ลบดีล
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showCustomer && (
        <Link href={`/customers/${deal.customer.id}`} className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
          {customerName}
        </Link>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {deal.amount != null && <span className="font-semibold tabular-nums">{baht.format(deal.amount)}</span>}
        {!showCustomer && (
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", stageStyle(current.color).chip)}>{current.name}</span>
        )}
        <FollowUpBadge date={deal.nextFollowUpAt} closed={closed} />
        {deal.quoteNo && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <FileText className="size-3" />
            {deal.quoteNo}
          </span>
        )}
        {deal.owner && (
          <span
            title={`ผู้ดูแล: ${deal.owner.name}`}
            className="ml-auto flex size-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-medium text-primary-soft-foreground"
          >
            {initials(deal.owner.name)}
          </span>
        )}
      </div>
      {deal.stage === LOST && deal.lostReason && <p className="mt-2 text-xs text-rose-700">เหตุผล: {deal.lostReason}</p>}

      {taskOpen && (
        <TaskDialog
          customer={{ id: deal.customer.id, name: customerName }}
          dealId={deal.id}
          defaultTitle={`ติดตามดีล ${deal.title}`}
          open
          onOpenChange={setTaskOpen}
        />
      )}
      {shipOpen && <ShipmentDialog customerId={deal.customer.id} dealId={deal.id} open onOpenChange={setShipOpen} />}
      <DealFormDialog open={editOpen} onOpenChange={setEditOpen} deal={deal} owners={owners} />
      <LostReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        onSubmit={async (reason) => {
          await move(LOST, reason);
          setLostOpen(false);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`ลบดีล "${deal.title}"?`}
        description="ลบถาวร รวมประวัติการย้ายขั้นของดีลนี้ (ข้อมูลลูกค้าไม่หาย) ถ้าลูกค้าไม่ซื้อ แนะนำให้ย้ายไป “ไม่ซื้อ” แทนการลบ"
        confirmLabel="ลบดีล"
        onConfirm={async () => {
          const r = await deleteDeal(deal.id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        }}
      />
    </div>
  );
}
