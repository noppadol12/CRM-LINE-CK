"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createStage, deleteStage, moveStage, updateStage } from "@/actions/stages";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isClosedStage, stageStyle } from "@/lib/deal-stages";
import type { TagColor } from "@/lib/tag-colors";
import { cn, thNumber } from "@/lib/utils";
import { ColorPicker } from "./tags-manager";

export type StageRow = { id: string; name: string; color: string; count: number };

const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

function StageEditor({ initial, onDone }: { initial?: StageRow; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<string>(initial?.color ?? "sky");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = initial ? await updateStage(initial.id, { name, color }) : await createStage({ name, color });
      if (r.ok) {
        toast.success(r.message);
        onDone();
      } else toast.error(r.error);
    });

  return (
    <div className="space-y-3 bg-muted/30 px-5 py-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && name.trim() && save()}
        placeholder="ชื่อขั้น เช่น รอช่างตรวจหน้างาน, ส่งตัวอย่างแล้ว"
        maxLength={40}
        autoFocus
      />
      <ColorPicker value={color} onChange={(c: TagColor) => setColor(c)} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDone} disabled={pending}>
          ยกเลิก
        </Button>
        <Button size="sm" onClick={save} disabled={pending || !name.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          {initial ? "บันทึก" : "เพิ่มขั้น"}
        </Button>
      </div>
    </div>
  );
}

function DeleteStageDialog({ stage, stages, onClose }: { stage: StageRow | null; stages: StageRow[]; onClose: () => void }) {
  const targets = stages.filter((s) => s.id !== stage?.id && !isClosedStage(s.id));
  const [moveTo, setMoveTo] = useState("");
  const [pending, start] = useTransition();
  const target = moveTo || targets[0]?.id || "";

  return (
    <Dialog open={Boolean(stage)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <DialogTitle>ลบขั้น &quot;{stage?.name}&quot;?</DialogTitle>
          <DialogDescription>
            {stage && stage.count > 0
              ? `มีดีลอยู่ในขั้นนี้ ${thNumber.format(stage.count)} รายการ เลือกขั้นที่จะย้ายดีลไปก่อนลบ`
              : "ขั้นนี้ไม่มีดีลอยู่ ลบได้ทันที"}
          </DialogDescription>
        </DialogHeader>
        {stage && stage.count > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="move-to">ย้ายดีลไปที่</Label>
            <select id="move-to" value={target} onChange={(e) => setMoveTo(e.target.value)} className={selectCls}>
              {targets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!stage) return;
                const r = await deleteStage(stage.id, stage.count > 0 ? target : null);
                if (r.ok) {
                  toast.success(r.message);
                  onClose();
                } else toast.error(r.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            ลบขั้น
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StagesManager({ stages, canEdit }: { stages: StageRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [deleting, setDeleting] = useState<StageRow | null>(null);
  const [, start] = useTransition();
  const open = stages.filter((s) => !isClosedStage(s.id));

  const move = (id: string, dir: -1 | 1) =>
    start(async () => {
      const r = await moveStage(id, dir);
      if (!r.ok) toast.error(r.error);
    });

  return (
    <div>
      {canEdit && editing !== "new" && (
        <div className="border-b px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus />
            เพิ่มขั้น
          </Button>
        </div>
      )}
      {editing === "new" && <StageEditor onDone={() => setEditing(null)} />}

      <ol className="divide-y">
        {stages.map((s) => {
          const system = isClosedStage(s.id);
          const idx = open.findIndex((o) => o.id === s.id);
          if (editing === s.id) {
            return (
              <li key={s.id}>
                <StageEditor initial={s} onDone={() => setEditing(null)} />
              </li>
            );
          }
          return (
            <li key={s.id} className={cn("group flex items-center gap-3 px-5 py-2.5", system && "bg-muted/20")}>
              <span className={cn("size-2.5 shrink-0 rounded-full", stageStyle(s.color).dot)} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{s.name}</span>
                  {system && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-normal text-muted-foreground" title="ใช้คำนวณยอดขายในรายงาน ลบไม่ได้ แต่เปลี่ยนชื่อ/สีได้">
                      <Lock className="size-3" />
                      {s.id === "WON" ? "ขั้นปิดการขาย" : "ขั้นไม่ซื้อ (ต้องระบุเหตุผล)"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{thNumber.format(s.count)} ดีล</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  {!system && (
                    <>
                      <Button variant="ghost" size="icon-sm" aria-label="เลื่อนขึ้น" disabled={idx === 0} onClick={() => move(s.id, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="เลื่อนลง" disabled={idx === open.length - 1} onClick={() => move(s.id, 1)}>
                        <ArrowDown />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon-sm" aria-label={`แก้ไข ${s.name}`} onClick={() => setEditing(s.id)}>
                    <Pencil />
                  </Button>
                  {!system && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ลบ ${s.name}`}
                      className="hover:text-destructive"
                      disabled={open.length <= 1}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <DeleteStageDialog key={deleting?.id ?? "none"} stage={deleting} stages={stages} onClose={() => setDeleting(null)} />
    </div>
  );
}
