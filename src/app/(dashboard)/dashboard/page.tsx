import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCards, KpiCardsSkeleton } from "./kpi-cards";
import { RecentChats, RecentChatsSkeleton } from "./recent-chats";
import { Greeting } from "./greeting";
import { FollowUps, FollowUpsSkeleton } from "./follow-ups";
import { TasksToday } from "./tasks-today";
import { MonthSales, MonthSalesSkeleton } from "./month-sales";

export const metadata: Metadata = { title: "แดชบอร์ด · CK CRM" };

async function MonthSalesSection({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const m = (await searchParams).m;
  return <MonthSales month={typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : undefined} />;
}

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader title="แดชบอร์ด" />
      <Suspense fallback={<p className="-mt-4 h-5 text-sm text-muted-foreground">&nbsp;</p>}>
        <Greeting />
      </Suspense>

      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCards />
      </Suspense>

      <Suspense fallback={<MonthSalesSkeleton />}>
        <MonthSalesSection searchParams={props.searchParams} />
      </Suspense>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<RecentChatsSkeleton />}>
            <RecentChats />
          </Suspense>
        </div>
        <div className="space-y-6">
          <Suspense fallback={<FollowUpsSkeleton />}>
            <TasksToday />
          </Suspense>
          <Suspense fallback={<FollowUpsSkeleton />}>
            <FollowUps />
          </Suspense>
        </div>
      </div>
    </>
  );
}
