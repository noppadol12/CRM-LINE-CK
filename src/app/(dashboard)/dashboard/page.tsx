import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCards, KpiCardsSkeleton } from "./kpi-cards";
import { RecentChats, RecentChatsSkeleton } from "./recent-chats";
import { Greeting } from "./greeting";
import { FollowUps, FollowUpsSkeleton } from "./follow-ups";

export const metadata: Metadata = { title: "แดชบอร์ด · CK CRM" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="แดชบอร์ด" />
      <Suspense fallback={<p className="-mt-4 h-5 text-sm text-muted-foreground">&nbsp;</p>}>
        <Greeting />
      </Suspense>

      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCards />
      </Suspense>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<RecentChatsSkeleton />}>
            <RecentChats />
          </Suspense>
        </div>
        <Suspense fallback={<FollowUpsSkeleton />}>
          <FollowUps />
        </Suspense>
      </div>
    </>
  );
}
