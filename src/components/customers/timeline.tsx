"use client";

import { useState } from "react";
import { Handshake, ListChecks, MessageSquare, PackageCheck, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "chat" | "deal" | "shipment" | "note" | "task";
export type TimelineEntry = { id: string; kind: Kind; at: Date; title: string; body?: string | null; by?: string | null };

const KINDS: { key: Kind | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "chat", label: "แชท" },
  { key: "deal", label: "ดีล" },
  { key: "shipment", label: "ส่งของ" },
  { key: "note", label: "โน้ต" },
  { key: "task", label: "งาน" },
];
const ICON = { chat: MessageSquare, deal: Handshake, shipment: PackageCheck, note: StickyNote, task: ListChecks };
const TONE = {
  chat: "bg-sky-50 text-sky-600",
  deal: "bg-primary-soft text-primary",
  shipment: "bg-violet-50 text-violet-600",
  note: "bg-amber-50 text-amber-700",
  task: "bg-slate-100 text-slate-600",
};
const fmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Timeline({ items }: { items: TimelineEntry[] }) {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const list = filter === "all" ? items : items.filter((i) => i.kind === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setFilter(k.key)}
            aria-pressed={filter === k.key}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              filter === k.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {k.label}
            {k.key !== "all" && <span className="ml-1 opacity-70">{items.filter((i) => i.kind === k.key).length}</span>}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีรายการ</p>
      ) : (
        <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
          {list.map((i) => {
            const Icon = ICON[i.kind];
            return (
              <li key={i.id} className="relative flex gap-3">
                <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card", TONE[i.kind])}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt.format(i.at)}
                      {i.by && ` · ${i.by}`}
                    </span>
                  </p>
                  {i.body && <p className="mt-0.5 line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">{i.body}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
