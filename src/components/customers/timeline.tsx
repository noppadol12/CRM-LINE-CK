"use client";

import { useState } from "react";
import { ChevronDown, Handshake, ListChecks, MessageSquare, PackageCheck, StickyNote } from "lucide-react";
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
/** จำนวนรายการที่แสดงก่อนกด "ดูเพิ่ม" */
const PAGE = 10;
const short = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
const fmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

function Row({ item, open, onToggle }: { item: TimelineEntry; open: boolean; onToggle: () => void }) {
  const Icon = ICON[item.kind];
  const hasMore = Boolean(item.body || item.by);
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasMore}
        aria-expanded={hasMore ? open : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg py-1.5 pr-1 text-left transition-colors",
          hasMore && "hover:bg-accent/60",
        )}
      >
        <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card", TONE[item.kind])}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.title}</span>
          {!open && item.body && <span className="block truncate text-xs text-muted-foreground">{item.body}</span>}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{short.format(item.at)}</span>
        {hasMore && <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
      </button>
      {open && (
        <div className="mb-1 ml-11 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {item.body && <p className="break-words whitespace-pre-wrap">{item.body}</p>}
          <p className={cn("text-xs text-muted-foreground", item.body && "mt-1.5")}>
            {fmt.format(item.at)}
            {item.by && ` · ${item.by}`}
          </p>
        </div>
      )}
    </li>
  );
}

export function Timeline({ items }: { items: TimelineEntry[] }) {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const list = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const visible = list.slice(0, shown);
  const toggle = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => {
              setFilter(k.key);
              setShown(PAGE);
            }}
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
        <>
          <ol className="relative space-y-0.5 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-border">
            {visible.map((i) => (
              <Row key={i.id} item={i} open={openIds.has(i.id)} onToggle={() => toggle(i.id)} />
            ))}
          </ol>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              แสดง {visible.length} จาก {list.length} รายการ
            </span>
            <div className="flex gap-1">
              {shown > PAGE && (
                <button type="button" onClick={() => setShown(PAGE)} className="rounded-md px-2 py-1.5 hover:bg-accent hover:text-foreground">
                  ย่อ
                </button>
              )}
              {list.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="rounded-md border px-3 py-1.5 font-medium text-foreground hover:bg-accent"
                >
                  ดูเพิ่ม {Math.min(PAGE, list.length - shown)} รายการ
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
