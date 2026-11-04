import { AlertTriangle, Database, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { dbUsage } from "@/lib/db-usage";
import { canManage } from "@/lib/permissions";
import { cn, thNumber } from "@/lib/utils";
import { DbPlanSelect } from "./db-plan-select";

function bytes(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function horizon(months: number | null) {
  if (months == null) return "ยังประเมินไม่ได้ (ยังมีข้อความน้อย)";
  if (months >= 120) return "มากกว่า 10 ปี";
  if (months >= 24) return `ประมาณ ${Math.floor(months / 12)} ปี`;
  if (months >= 1) return `ประมาณ ${Math.floor(months)} เดือน`;
  return "ไม่ถึง 1 เดือน";
}

export async function DatabaseUsage() {
  const user = await getCurrentUser();
  const u = await dbUsage();
  const tone = u.pct >= 90 ? "bg-rose-500" : u.pct >= 70 ? "bg-amber-500" : "bg-primary";
  const maxTable = Math.max(1, ...u.tables.map((t) => t.size));

  return (
    <Card id="database" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>พื้นที่ฐานข้อมูล (Supabase)</CardTitle>
        <CardDescription>ข้อความแชท ลูกค้า ดีล และข้อมูลทั้งหมดของระบบ (รูป/ไฟล์เก็บใน Google Drive แยกต่างหาก ไม่นับรวม)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Database className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold whitespace-nowrap tabular-nums">
                  {bytes(u.used)} <span className="text-sm font-normal text-muted-foreground">/ {bytes(u.limit)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  เหลือ {bytes(Math.max(0, u.limit - u.used))} · ใช้ไป {u.pct.toFixed(u.pct < 10 ? 1 : 0)}%
                </p>
              </div>
            </div>
            <DbPlanSelect value={u.plan} disabled={!canManage(user)} />
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={Math.round(u.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="พื้นที่ที่ใช้">
            <div className={cn("h-full rounded-full transition-[width]", tone)} style={{ width: `${Math.max(1, u.pct)}%` }} />
          </div>
        </div>

        {u.pct >= 80 && (
          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>พื้นที่ใกล้เต็ม — แนะนำอัปเกรด Supabase เป็น Pro (8 GB) หรือแจ้งให้ช่วยล้างข้อมูลเก่า</p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">ข้อความ 30 วันล่าสุด</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {thNumber.format(u.msg30)} ข้อความ
              {u.monthlyGrowth > 0 && <span className="block text-xs font-normal text-muted-foreground">≈ {bytes(u.monthlyGrowth)} / เดือน</span>}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">ใช้ได้อีก (ตามอัตราปัจจุบัน)</dt>
            <dd className="mt-0.5 font-medium">{horizon(u.monthsLeft)}</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">ข้อมูลที่ใช้พื้นที่มากสุด</p>
          <ul className="space-y-2">
            {u.tables.map((t) => (
              <li key={t.name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{t.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t.rows > 0 && `${thNumber.format(t.rows)} รายการ · `}
                    {bytes(t.size)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${(t.size / maxTable) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          ตัวเลขทางการดูได้ที่
          <a href="https://supabase.com/dashboard/project/_/settings/billing/usage" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
            Supabase → Usage <ExternalLink className="size-3" />
          </a>
          · ระบบล้างประวัติ event เก่าเกิน 90 วันให้อัตโนมัติ
        </p>
      </CardContent>
    </Card>
  );
}
