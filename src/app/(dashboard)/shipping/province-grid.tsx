"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search, Truck, Users } from "lucide-react";
import { REGIONS } from "@/lib/provinces";
import { cn, thNumber } from "@/lib/utils";

type Stats = Record<string, { carriers: number; customers: number }>;

export function ProvinceGrid({ stats }: { stats: Stats }) {
  const [q, setQ] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const all = Object.values(stats);
  const covered = all.filter((s) => s.carriers > 0).length;
  const gaps = Object.entries(stats).filter(([, s]) => s.customers > 0 && s.carriers === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex items-center sm:w-72">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาจังหวัด"
            aria-label="ค้นหาจังหวัด"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          มีขนส่งแล้ว {covered}/77 จังหวัด
          {gaps > 0 && (
            <button type="button" onClick={() => setOnlyGaps((v) => !v)} className="ml-2 font-medium text-amber-700 hover:underline">
              · มีลูกค้าแต่ยังไม่มีขนส่ง {gaps} จังหวัด {onlyGaps ? "(แสดงทั้งหมด)" : "(ดู)"}
            </button>
          )}
        </p>
      </div>

      {REGIONS.map((r) => {
        const list = r.provinces.filter((p) => p.includes(q.trim()) && (!onlyGaps || (stats[p].customers > 0 && stats[p].carriers === 0)));
        if (list.length === 0) return null;
        return (
          <section key={r.key} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {r.name} <span className="font-normal">({r.provinces.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((p) => {
                const s = stats[p];
                const gap = s.customers > 0 && s.carriers === 0;
                return (
                  <Link
                    key={p}
                    href={`/shipping/provinces/${encodeURIComponent(p)}`}
                    className={cn(
                      "rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary hover:bg-primary-soft/40",
                      gap && "border-amber-300 bg-amber-50/60",
                      s.carriers === 0 && s.customers === 0 && "text-muted-foreground",
                    )}
                  >
                    <p className="flex items-center gap-1 truncate text-sm font-medium">
                      {gap && <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />}
                      {p}
                    </p>
                    <p className="mt-1 flex gap-3 text-xs text-muted-foreground tabular-nums">
                      <span className={cn("flex items-center gap-1", s.carriers > 0 && "text-primary")}>
                        <Truck className="size-3" /> {thNumber.format(s.carriers)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" /> {thNumber.format(s.customers)}
                      </span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
