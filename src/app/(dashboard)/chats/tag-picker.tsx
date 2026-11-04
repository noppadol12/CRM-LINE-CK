"use client";

import { useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { tagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

export type TagOption = { id: string; name: string; color: string; count: number };

/** รายการแท็กทั้งหมดแบบค้นหาได้ เลือกได้หลายแท็ก */
export function TagPicker({
  tags,
  picked,
  trigger,
  onApply,
}: {
  tags: TagOption[];
  picked: string[];
  trigger: ReactNode;
  onApply: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>(picked);
  const term = q.trim().toLowerCase();
  const shown = term ? tags.filter((t) => t.name.toLowerCase().includes(term)) : tags;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setSel(picked);
          setQ("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-sm"
        // มือถือ: ไม่เด้งคีย์บอร์ดขึ้นมาบังรายการทันทีที่เปิด
        onOpenAutoFocus={(e) => {
          if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>กรองแชทตามแท็ก</DialogTitle>
          <DialogDescription>เลือกได้หลายแท็ก — แสดงห้องที่ติดแท็กใดแท็กหนึ่ง</DialogDescription>
        </DialogHeader>
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`ค้นหาแท็ก (${tags.length})`}
            aria-label="ค้นหาแท็ก"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </label>
        <ul className="-mx-1 max-h-[50dvh] overflow-y-auto" role="listbox" aria-multiselectable>
          {shown.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">ไม่พบแท็ก</li>}
          {shown.map((t) => {
            const on = sel.includes(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(t.id)}
                  className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-sm hover:bg-accent", on && "bg-primary-soft")}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <span className={cn("size-2.5 shrink-0 rounded-full", tagColor(t.color).dot)} />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button type="button" variant="ghost" disabled={sel.length === 0} onClick={() => setSel([])}>
            ล้าง
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            onClick={() => {
              onApply(sel);
              setOpen(false);
            }}
          >
            {sel.length ? `แสดง ${sel.length} แท็ก` : "แสดงทั้งหมด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
