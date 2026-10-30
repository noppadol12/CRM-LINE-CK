"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Settings2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type QuickReply = { id: string; title: string; body: string };

/** แทนตัวแปรในข้อความสำเร็จรูป */
export function fillTemplate(body: string, vars: { customerName: string }) {
  return body.replaceAll("{ชื่อลูกค้า}", vars.customerName);
}

export function QuickReplyPicker({
  replies,
  customerName,
  onPick,
  canManage,
}: {
  replies: QuickReply[];
  customerName: string;
  onPick: (text: string) => void;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = replies.filter((r) => !q || r.title.includes(q) || r.body.includes(q));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="size-10 shrink-0 rounded-lg" aria-label="ข้อความสำเร็จรูป" title="ข้อความสำเร็จรูป">
          <Zap />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80 p-0">
        <div className="border-b p-2">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาข้อความสำเร็จรูป"
              autoFocus
              className="h-8 w-full rounded-md bg-muted pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">ไม่พบข้อความ</li>}
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(fillTemplate(r.body, { customerName }));
                  setOpen(false);
                }}
                className="w-full rounded-md px-2.5 py-2 text-left hover:bg-accent"
              >
                <p className="text-sm font-medium">{r.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{fillTemplate(r.body, { customerName })}</p>
              </button>
            </li>
          ))}
        </ul>
        {canManage && (
          <Link href="/settings#quick-replies" className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <Settings2 className="size-3.5" />
            จัดการข้อความสำเร็จรูป
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
