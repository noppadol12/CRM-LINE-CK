import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { baht, bahtCompact } from "@/lib/deal-stages";
import { monthlySales, type MonthSales as Row } from "@/lib/reports";
import { cn, thNumber } from "@/lib/utils";
import { MonthPicker } from "./month-picker";

const monthName = (key: string, style: "long" | "short" = "long") => {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { month: style, year: style === "long" ? "numeric" : "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
};
const pctOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const pctText = (p: number) => `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`;

function Legend({ tone, label, amount, deals }: { tone: string; label: string; amount: number; deals: number }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-sm", tone)} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium tabular-nums">
          {baht.format(amount)} <span className="font-normal text-muted-foreground">· {thNumber.format(deals)} ดีล</span>
        </p>
      </div>
    </div>
  );
}

export async function MonthSales({ month }: { month?: string }) {
  await getCurrentUser();
  const rows = await monthlySales();
  const cur = rows.find((r) => r.month === month) ?? rows[rows.length - 1];
  const rate = pctOf(cur.won, cur.opened);
  const seg = (v: number) => `${pctOf(v, cur.opened)}%`;
  const recent = rows.slice(-6).reverse();
  const maxOpened = Math.max(1, ...recent.map((r) => r.opened));

  return (
    <Card className="gap-5 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <TrendingUp className="size-[18px]" />
          </span>
          <div>
            <p className="font-medium">ยอดปิดการขายจากดีลที่เปิด</p>
            <p className="text-xs text-muted-foreground">ดีลที่เปิดในเดือนที่เลือก ปิดการขายได้แล้วกี่บาท</p>
          </div>
        </div>
        <MonthPicker value={cur.month} options={rows.map((r) => ({ value: r.month, label: monthName(r.month) })).reverse()} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">เปิดดีล</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">฿{bahtCompact.format(cur.opened)}</p>
              <p className="text-xs text-muted-foreground">{thNumber.format(cur.openedDeals)} ดีล</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ปิดการขายได้</p>
              <p className="text-2xl font-semibold tracking-tight text-primary tabular-nums sm:text-3xl">฿{bahtCompact.format(cur.won)}</p>
              <p className="text-xs text-muted-foreground">{thNumber.format(cur.wonDeals)} ดีล</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">คิดเป็น</p>
              <p className={cn("text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl", cur.opened ? "" : "text-muted-foreground")}>
                {cur.opened ? pctText(rate) : "–"}
              </p>
              <p className="text-xs text-muted-foreground">ของยอดที่เปิด</p>
            </div>
          </div>

          <div
            className="flex h-3 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`ปิดได้ ${pctText(rate)} ไม่สำเร็จ ${pctText(pctOf(cur.lost, cur.opened))} ยังไม่ปิด ${pctText(pctOf(cur.pending, cur.opened))}`}
          >
            {cur.opened > 0 && (
              <>
                <div className="h-full bg-primary" style={{ width: seg(cur.won) }} />
                <div className="h-full bg-rose-400" style={{ width: seg(cur.lost) }} />
                <div className="h-full bg-amber-300" style={{ width: seg(cur.pending) }} />
              </>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Legend tone="bg-primary" label="ปิดการขายได้" amount={cur.won} deals={cur.wonDeals} />
            <Legend tone="bg-rose-400" label="ไม่สำเร็จ" amount={cur.lost} deals={cur.lostDeals} />
            <Legend tone="bg-amber-300" label="ยังไม่ปิด" amount={cur.pending} deals={cur.pendingDeals} />
          </div>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            ยอดปิดการขายทั้งหมดที่เกิดใน{monthName(cur.month)}{" "}
            <span className="font-medium text-foreground tabular-nums">{baht.format(cur.wonInMonth)}</span> ({thNumber.format(cur.wonInMonthDeals)} ดีล) —
            รวมดีลที่เปิดจากเดือนก่อน
          </p>
        </div>

        <div className="space-y-2 lg:border-l lg:pl-5">
          <p className="text-xs font-medium text-muted-foreground">6 เดือนล่าสุด</p>
          <ul className="space-y-2.5">
            {recent.map((r: Row) => {
              const p = pctOf(r.won, r.opened);
              return (
                <li key={r.month} className={cn("space-y-1", r.month === cur.month && "font-medium")}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="w-14 shrink-0">{monthName(r.month, "short")}</span>
                    <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground tabular-nums">
                      ฿{bahtCompact.format(r.won)} / ฿{bahtCompact.format(r.opened)}
                    </span>
                    <span className="w-12 shrink-0 text-right tabular-nums">{r.opened ? pctText(p) : "–"}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-muted-foreground/25" style={{ width: `${pctOf(r.opened, maxOpened)}%` }}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function MonthSalesSkeleton() {
  return (
    <Card className="gap-5 px-4 py-5 sm:px-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="h-3 w-full" />
    </Card>
  );
}
