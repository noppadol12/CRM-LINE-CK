"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { moveDealStage } from "@/actions/deals";
import { DealCard, LostReasonDialog } from "@/components/deals/deal-card";
import { DealFormDialog, type Owner } from "@/components/deals/deal-form-dialog";
import { Button } from "@/components/ui/button";
import { DEAL_STAGES, OPEN_STAGES, baht, type DealStageKey } from "@/lib/deal-stages";
import type { DealDTO } from "@/lib/deals";
import { cn, thNumber } from "@/lib/utils";

export function DealBoard({ deals, owners, canManage }: { deals: DealDTO[]; owners: Owner[]; canManage: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const owner = params.get("owner") ?? "";
  const [dragOver, setDragOver] = useState<DealStageKey | null>(null);
  const [pendingLost, setPendingLost] = useState<string | null>(null);

  const [board, moveOptimistic] = useOptimistic(deals, (state, { id, stage }: { id: string; stage: DealStageKey }) =>
    state.map((d) => (d.id === id ? { ...d, stage } : d)),
  );

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if ((params.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => setParam("q", q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function move(id: string, stage: DealStageKey, lostReason?: string) {
    if (stage === "LOST" && !lostReason) {
      setPendingLost(id);
      return;
    }
    startTransition(async () => {
      moveOptimistic({ id, stage });
      const r = await moveDealStage(id, stage, lostReason);
      if (!r.ok) toast.error(r.error);
    });
  }

  const openTotal = board.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + (d.amount ?? 0), 0);
  const openCount = board.filter((d) => OPEN_STAGES.includes(d.stage)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">ดีล / ใบเสนอราคา</h1>
          <p className="text-sm text-muted-foreground">
            เปิดอยู่ {thNumber.format(openCount)} ดีล · มูลค่ารวม {baht.format(openTotal)} · ลากการ์ดเพื่อเปลี่ยนขั้น
          </p>
        </div>
        <DealFormDialog
          owners={owners}
          trigger={
            <Button>
              <Plus />
              สร้างดีล
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex items-center sm:w-72">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาดีล ลูกค้า เลขใบเสนอราคา"
            aria-label="ค้นหาดีล"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </label>
        <select
          value={owner}
          onChange={(e) => setParam("owner", e.target.value || null)}
          aria-label="ผู้ดูแล"
          className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none sm:w-48"
        >
          <option value="">ทุกคน</option>
          <option value="me">ดีลของฉัน</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {DEAL_STAGES.map((stage) => {
          const items = board.filter((d) => d.stage === stage.key);
          const total = items.reduce((s, d) => s + (d.amount ?? 0), 0);
          return (
            <section
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.key);
              }}
              onDragLeave={() => setDragOver((s) => (s === stage.key ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/deal-id");
                const deal = board.find((d) => d.id === id);
                if (deal && deal.stage !== stage.key) move(id, stage.key);
              }}
              className={cn(
                "flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-muted/40 transition-colors",
                dragOver === stage.key && "border-primary bg-primary-soft/60",
              )}
            >
              <header className="space-y-1 px-3 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", stage.dot)} />
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <span className="rounded-full bg-card px-1.5 text-xs text-muted-foreground">{items.length}</span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {total > 0 ? baht.format(total) : "—"}
                  {(stage.key === "WON" || stage.key === "LOST") && " · 30 วันล่าสุด"}
                </p>
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {items.map((d) => (
                  <DealCard key={d.id} deal={d} owners={owners} canManage={canManage} draggable onMove={(s, reason) => move(d.id, s, reason)} />
                ))}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">ลากการ์ดมาวางที่นี่</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <LostReasonDialog
        open={pendingLost !== null}
        onOpenChange={(o) => !o && setPendingLost(null)}
        onSubmit={async (reason) => {
          if (pendingLost) move(pendingLost, "LOST", reason);
          setPendingLost(null);
        }}
      />
    </div>
  );
}
