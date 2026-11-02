"use client";

import {
  startTransition,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Hourglass, Loader2, Plus, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { loadMoreDeals, moveDealStage } from "@/actions/deals";
import { DealCard, LostReasonDialog } from "@/components/deals/deal-card";
import {
  DealFormDialog,
  type Owner,
} from "@/components/deals/deal-form-dialog";
import { Button } from "@/components/ui/button";
import {
  CLOSED_RANGES,
  DEFAULT_CLOSED_RANGE,
  LOST,
  STALE_DAYS,
  baht,
  isClosedStage,
  stageStyle,
} from "@/lib/deal-stages";
import { useStages } from "@/components/deals/stages-context";
import type { DealDTO, StageSummary } from "@/lib/deals";
import { cn, thNumber } from "@/lib/utils";

export function DealBoard({
  deals,
  summary,
  owners,
  canManage,
}: {
  deals: DealDTO[];
  summary: Record<string, StageSummary>;
  owners: Owner[];
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const owner = params.get("owner") ?? "";
  const stages = useStages();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<string | null>(null);

  const closedRange = params.get("closed") ?? DEFAULT_CLOSED_RANGE;
  const staleOnly = params.get("stale") === "1";
  const searching = Boolean(params.get("q"));
  const closedLabel = searching
    ? "ผลค้นหาทุกช่วงเวลา"
    : closedRange === "all"
      ? "ทั้งหมด"
      : `${closedRange} วันล่าสุด`;

  // การ์ดที่โหลดเพิ่ม (ปุ่ม "ดูเพิ่ม") — ล้างเองเมื่อเปลี่ยนตัวกรอง เพราะหน้าใส่ key ตามพารามิเตอร์
  const [extra, setExtra] = useState<DealDTO[]>([]);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [, startLoad] = useTransition();
  const seen = new Set(deals.map((d) => d.id));
  const loaded = [...deals, ...extra.filter((d) => !seen.has(d.id))];

  const [board, moveOptimistic] = useOptimistic(
    loaded,
    (state, { id, stage }: { id: string; stage: string }) =>
      state.map((d) => (d.id === id ? { ...d, stage } : d)),
  );

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    const qs = next.toString();
    startTransition(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  };

  useEffect(() => {
    if ((params.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => setParam("q", q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function move(id: string, stage: string, lostReason?: string) {
    if (stage === LOST && !lostReason) {
      setPendingLost(id);
      return;
    }
    startTransition(async () => {
      moveOptimistic({ id, stage });
      const r = await moveDealStage(id, stage, lostReason);
      if (!r.ok) toast.error(r.error);
    });
  }

  /** จำนวนจริงของแต่ละขั้น (จากเซิร์ฟเวอร์) + ส่วนที่เพิ่งลากย้ายแต่ยังไม่รีเฟรช */
  const origStage = new Map(loaded.map((d) => [d.id, d.stage]));
  const delta: Record<string, { n: number; amt: number }> = {};
  for (const d of board) {
    const from = origStage.get(d.id);
    if (!from || from === d.stage) continue;
    delta[from] = {
      n: (delta[from]?.n ?? 0) - 1,
      amt: (delta[from]?.amt ?? 0) - (d.amount ?? 0),
    };
    delta[d.stage] = {
      n: (delta[d.stage]?.n ?? 0) + 1,
      amt: (delta[d.stage]?.amt ?? 0) + (d.amount ?? 0),
    };
  }
  const countOf = (id: string) =>
    Math.max(0, (summary[id]?.count ?? 0) + (delta[id]?.n ?? 0));
  const totalOf = (id: string) =>
    (summary[id]?.total ?? 0) + (delta[id]?.amt ?? 0);
  const openIds = stages.filter((s) => !isClosedStage(s.id)).map((s) => s.id);
  const openCount = openIds.reduce((n, id) => n + countOf(id), 0);
  const openTotal = openIds.reduce((n, id) => n + totalOf(id), 0);
  const staleCount = openIds.reduce(
    (n, id) => n + (summary[id]?.stale ?? 0),
    0,
  );

  function loadMore(stageId: string) {
    const offset = loaded.filter((d) => d.stage === stageId).length;
    setLoadingStage(stageId);
    startLoad(async () => {
      try {
        const rows = await loadMoreDeals(
          stageId,
          offset,
          Object.fromEntries(params.entries()),
        );
        setExtra((x) => [...x, ...rows]);
      } catch {
        toast.error("โหลดดีลเพิ่มไม่สำเร็จ ลองอีกครั้ง");
      } finally {
        setLoadingStage(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            ดีล / ใบเสนอราคา
          </h1>
          <p className="text-sm text-muted-foreground">
            เปิดอยู่ {thNumber.format(openCount)} ดีล · มูลค่ารวม{" "}
            {baht.format(openTotal)} · ลากการ์ดเพื่อเปลี่ยนขั้น
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" asChild>
              <Link href="/settings#stages">
                <Settings2 />
                จัดการขั้นตอน
              </Link>
            </Button>
          )}
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
        <div className="flex gap-2">
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
          <select
            value={closedRange}
            onChange={(e) =>
              setParam(
                "closed",
                e.target.value === DEFAULT_CLOSED_RANGE ? null : e.target.value,
              )
            }
            aria-label="ดีลที่ปิดแล้ว แสดงย้อนหลัง"
            disabled={searching}
            title={searching ? "ขณะค้นหาจะแสดงดีลทุกช่วงเวลา" : undefined}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none disabled:opacity-60 sm:w-44 sm:flex-none"
          >
            {CLOSED_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                ที่ปิดแล้ว: {r.label}
              </option>
            ))}
          </select>
        </div>
        {(staleCount > 0 || staleOnly) && (
          <button
            type="button"
            onClick={() => setParam("stale", staleOnly ? null : "1")}
            aria-pressed={staleOnly}
            title={`ดีลที่อยู่ขั้นเดิมเกิน ${STALE_DAYS} วัน`}
            className={cn(
              "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
              staleOnly
                ? "border-orange-300 bg-orange-50 font-medium text-orange-700"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Hourglass className="size-4" />
            ค้างนาน {thNumber.format(staleCount)}
          </button>
        )}
      </div>
      {searching && (
        <p className="-mt-2 text-xs text-muted-foreground">
          กำลังค้นหาดีลทั้งหมด รวมดีลที่ปิดไปนานแล้ว
        </p>
      )}

      {/* มือถือ: แตะชื่อขั้นเพื่อเลื่อนไปคอลัมน์นั้น */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:hidden">
        {stages.map((s) => {
          const n = countOf(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                document
                  .getElementById(`stage-${s.id}`)
                  ?.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  })
              }
              className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs"
            >
              <span
                className={cn("size-2 rounded-full", stageStyle(s.color).dot)}
              />
              {s.name}
              <span className="text-muted-foreground">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:snap-proximity sm:px-6 lg:-mx-8 lg:px-8">
        {stages.map((stage) => {
          const items = board.filter((d) => d.stage === stage.id);
          const count = countOf(stage.id);
          const total = totalOf(stage.id);
          const hasMore =
            loaded.filter((d) => d.stage === stage.id).length <
            (summary[stage.id]?.count ?? 0);
          return (
            <section
              key={stage.id}
              id={`stage-${stage.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() =>
                setDragOver((s) => (s === stage.id ? null : s))
              }
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/deal-id");
                const deal = board.find((d) => d.id === id);
                if (deal && deal.stage !== stage.id) move(id, stage.id);
              }}
              className={cn(
                "flex w-[82vw] max-w-80 shrink-0 snap-center flex-col rounded-xl border bg-muted/40 transition-colors sm:w-72 sm:snap-start",
                dragOver === stage.id && "border-primary bg-primary-soft/60",
              )}
            >
              <header className="space-y-1 px-3 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      stageStyle(stage.color).dot,
                    )}
                  />
                  <h2 className="text-sm font-semibold">{stage.name}</h2>
                  <span className="rounded-full bg-card px-1.5 text-xs text-muted-foreground tabular-nums">
                    {thNumber.format(count)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {total > 0 ? baht.format(total) : "—"}
                  {isClosedStage(stage.id) && ` · ${closedLabel}`}
                </p>
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {items.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    owners={owners}
                    canManage={canManage}
                    draggable
                    onMove={(s, reason) => move(d.id, s, reason)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    {staleOnly && !isClosedStage(stage.id)
                      ? "ไม่มีดีลค้างนาน"
                      : "ลากการ์ดมาวางที่นี่"}
                  </p>
                )}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => loadMore(stage.id)}
                    disabled={loadingStage !== null}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed bg-card/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:opacity-60"
                  >
                    {loadingStage === stage.id && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    ดูเพิ่ม (เหลืออีก{" "}
                    {thNumber.format(Math.max(0, count - items.length))})
                  </button>
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
          if (pendingLost) move(pendingLost, LOST, reason);
          setPendingLost(null);
        }}
      />
    </div>
  );
}
