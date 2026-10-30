import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { listBoardDeals, listOwners, parseDealParams } from "@/lib/deals";
import { canManage } from "@/lib/permissions";
import { DealBoard } from "./deal-board";

export const metadata: Metadata = { title: "ดีล · CK CRM" };

export default function DealsPage({ searchParams }: PageProps<"/deals">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <DealsSection searchParams={searchParams} />
    </Suspense>
  );
}

async function DealsSection({ searchParams }: { searchParams: PageProps<"/deals">["searchParams"] }) {
  const user = await getCurrentUser();
  const params = parseDealParams(await searchParams);
  const [deals, owners] = await Promise.all([listBoardDeals({ ...params, userId: user.id }), listOwners()]);
  return <DealBoard deals={deals} owners={owners} canManage={canManage(user)} />;
}

function BoardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
