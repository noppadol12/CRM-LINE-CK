import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Clock3, Handshake, Percent, Receipt, UserPlus, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { baht, bahtCompact } from "@/lib/deal-stages";
import {
  dailyActivity,
  lostReasons,
  ownerPerformance,
  parsePeriod,
  PERIODS,
  periodSummary,
  pipelineSnapshot,
  responseTimes,
  wonByMonth,
} from "@/lib/reports";
import { cn, thNumber } from "@/lib/utils";
import { DailyBars, HorizontalBars, MonthlyWonChart } from "./charts";

export const metadata: Metadata = { title: "รายงาน · CK CRM" };

export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
function duration(min: number | null) {
  if (min == null) return "—";
  if (min < 1) return "< 1 นาที";
  if (min < 60) return `${Math.round(min)} นาที`;
  if (min < 60 * 24) return `${(min / 60).toFixed(1)} ชม.`;
  return `${(min / 60 / 24).toFixed(1)} วัน`;
}

function Kpi({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <Card className="gap-2 px-4 py-4 sm:px-5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Card>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/reports">["searchParams"] }) {
  await getCurrentUser();
  const period = parsePeriod(await searchParams);
  const days = period.days;
  const dailyDays = Math.min(days, 90);

  const [months, summary, pipeline, lost, daily, resp, owners] = await Promise.all([
    wonByMonth(),
    periodSummary(days),
    pipelineSnapshot(),
    lostReasons(days),
    dailyActivity(dailyDays),
    responseTimes(days),
    ownerPerformance(days),
  ]);

  const pipelineTotal = pipeline.reduce((s, p) => s + p.amount, 0);
  const inboundTotal = daily.reduce((s, d) => s + d.inbound, 0);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">รายงาน</h1>
          <p className="text-sm text-muted-foreground">ยอดขาย ดีล และการตอบแชท · ตัวเลขด้านล่างคิดจาก {period.label}ล่าสุด</p>
        </div>
        <nav className="inline-flex rounded-md border bg-muted/60 p-0.5" aria-label="ช่วงเวลา">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={p.key === "90" ? "/reports" : `/reports?p=${p.key}`}
              replace
              scroll={false}
              aria-current={p.key === period.key ? "page" : undefined}
              className={cn(
                "h-8 rounded px-3 text-sm leading-8 whitespace-nowrap transition-colors",
                p.key === period.key ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi icon={Receipt} label="ยอดปิดการขาย" value={`฿${bahtCompact.format(summary.wonAmount)}`} sub={`${thNumber.format(summary.wonCount)} ดีล`} />
        <Kpi icon={Percent} label="อัตราปิดการขาย" value={pct(summary.winRate)} sub={`ปิดได้ ${summary.wonCount} · ไม่ซื้อ ${summary.lostCount}`} />
        <Kpi
          icon={Handshake}
          label="มูลค่าเฉลี่ยต่อดีล"
          value={summary.avgDeal == null ? "—" : baht.format(summary.avgDeal)}
          sub={summary.medianDaysToClose == null ? undefined : `ปิดได้ใน ~${Math.round(summary.medianDaysToClose)} วัน`}
        />
        <Kpi icon={Clock3} label="เวลาตอบแชท (มัธยฐาน)" value={duration(resp.medianMinutes)} sub={`ช้าสุด 10%: ${duration(resp.p90Minutes)}`} />
        <Kpi icon={UserPlus} label="ลูกค้าใหม่" value={thNumber.format(summary.newCustomers)} sub="ราย" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>ยอดปิดการขายรายเดือน</CardTitle>
            <CardDescription>มูลค่าดีลที่ย้ายเข้า &quot;ปิดการขาย&quot; · 12 เดือนล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyWonChart data={months} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ดีลที่เปิดอยู่ตอนนี้</CardTitle>
            <CardDescription>มูลค่ารวม {baht.format(pipelineTotal)}</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={pipeline.map((p) => ({ label: p.name, value: p.amount, extra: `${p.deals} ดีล` }))}
              valueLabel="มูลค่า"
              secondary="จำนวน"
              format="baht"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ข้อความจากลูกค้ารายวัน</CardTitle>
            <CardDescription>
              {thNumber.format(inboundTotal)} ข้อความ · {dailyDays} วันล่าสุด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyBars data={daily} dataKey="inbound" label="ข้อความ" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ลูกค้าใหม่รายวัน</CardTitle>
            <CardDescription>เพิ่มเพื่อน LINE หรือเพิ่มเอง · {dailyDays} วันล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyBars data={daily} dataKey="newCustomers" label="ลูกค้าใหม่" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>สาเหตุที่ลูกค้าไม่ซื้อ</CardTitle>
            <CardDescription>จำนวนดีลที่ย้ายไป &quot;ไม่ซื้อ&quot; ใน {period.label}</CardDescription>
          </CardHeader>
          <CardContent>
            {lost.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีดีลที่ไม่ซื้อในช่วงนี้</p>
            ) : (
              <HorizontalBars
                data={lost.slice(0, 6).map((l) => ({ label: l.reason, value: l.deals, extra: baht.format(l.amount) }))}
                valueLabel="ดีล"
                secondary="มูลค่าที่เสีย"
              />
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>ผลงานรายคน</CardTitle>
            <CardDescription>ตามผู้ดูแลดีล · ปิดได้/ไม่ซื้อ คิดจาก {period.label}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">ผู้ดูแล</th>
                  <th className="px-3 py-2 text-right font-medium">ปิดได้</th>
                  <th className="px-3 py-2 text-right font-medium">ยอดขาย</th>
                  <th className="px-3 py-2 text-right font-medium">อัตราปิด</th>
                  <th className="px-5 py-2 text-right font-medium">เปิดอยู่</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {owners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      ยังไม่มีดีล
                    </td>
                  </tr>
                )}
                {owners.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-2.5 font-medium">{o.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{o.won}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{baht.format(o.wonAmount)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{pct(o.winRate)}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap tabular-nums">
                      {o.open} <span className="text-xs text-muted-foreground">(฿{bahtCompact.format(o.openAmount)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        เวลาตอบแชทนับจากข้อความแรกของลูกค้าในแต่ละรอบ ถึงข้อความแรกที่ตอบผ่านระบบนี้ (ข้อความที่ตอบจากแอป LINE OA Manager โดยตรงไม่ถูกนับ) ·
        ยังรอตอบอยู่ {thNumber.format(resp.waiting)} รอบ
      </p>
    </>
  );
}

function ReportsSkeleton() {
  return (
    <>
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </>
  );
}
