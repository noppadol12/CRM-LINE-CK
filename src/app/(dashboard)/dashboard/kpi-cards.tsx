import { Gift, MessageCircleMore, UserPlus, Users, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { thNumber } from "@/lib/utils";

/** วันที่ 1 ของเดือนนี้ ตามเวลาไทย */
function startOfMonthBangkok(): Date {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, 1, -7)); // 00:00 น. เวลาไทย = 17:00 UTC ของวันก่อน
}

type Kpi = { label: string; value: number; hint: string; icon: LucideIcon; tone: string };

export async function KpiCards() {
  await getCurrentUser();

  const active = { deletedAt: null };
  const [customers, newThisMonth, awaiting, points] = await Promise.all([
    prisma.customer.count({ where: active }),
    prisma.customer.count({ where: { ...active, createdAt: { gte: startOfMonthBangkok() } } }),
    prisma.customer.count({ where: { ...active, unreadCount: { gt: 0 } } }),
    prisma.customer.aggregate({ where: active, _sum: { pointBalance: true } }),
  ]);

  const kpis: Kpi[] = [
    { label: "ลูกค้าทั้งหมด", value: customers, hint: "ราย", icon: Users, tone: "bg-sky-50 text-sky-600" },
    { label: "ลูกค้าใหม่เดือนนี้", value: newThisMonth, hint: "ราย", icon: UserPlus, tone: "bg-violet-50 text-violet-600" },
    { label: "แชทรอตอบ", value: awaiting, hint: "ห้อง", icon: MessageCircleMore, tone: "bg-amber-50 text-amber-600" },
    { label: "แต้มคงเหลือรวม", value: points._sum.pointBalance ?? 0, hint: "แต้ม", icon: Gift, tone: "bg-primary-soft text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
        <Card key={label} className="gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 ${tone}`}>
              <Icon className="size-[18px]" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{thNumber.format(value)}</span>
            <span className="text-sm text-muted-foreground">{hint}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20" />
        </Card>
      ))}
    </div>
  );
}
