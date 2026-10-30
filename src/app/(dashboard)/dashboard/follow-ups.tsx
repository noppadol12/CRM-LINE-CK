import Link from "next/link";
import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { FollowUpBadge } from "@/components/deals/deal-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { baht, stageInfo } from "@/lib/deal-stages";
import { listDueFollowUps } from "@/lib/deals";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function FollowUps() {
  await getCurrentUser();
  const deals = await listDueFollowUps(6);

  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="flex-row items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <CardTitle>ต้องติดตามวันนี้</CardTitle>
          <CardDescription>ดีลที่ถึงหรือเลยวันนัด</CardDescription>
        </div>
        <Link href="/deals" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          ดีลทั้งหมด <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="px-2">
        {deals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CalendarCheck2 className="size-8 text-muted-foreground/50" />
            ไม่มีดีลค้างติดตาม
          </div>
        ) : (
          <ul className="divide-y">
            {deals.map((d) => {
              const stage = stageInfo(d.stage);
              return (
                <li key={d.id}>
                  <Link
                    href={d.customer.lineUserId ? `/chats?c=${d.customer.id}` : `/customers/${d.customer.id}`}
                    className="block rounded-lg px-3 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.title}</span>
                      {d.amount != null && <span className="text-sm font-semibold tabular-nums">{baht.format(d.amount)}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{displayName(d.customer)}</span>
                      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", stage.chip)}>{stage.short}</span>
                      <span className="ml-auto shrink-0">
                        <FollowUpBadge date={d.nextFollowUpAt} />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function FollowUpsSkeleton() {
  return <Skeleton className="h-80 rounded-xl" />;
}
