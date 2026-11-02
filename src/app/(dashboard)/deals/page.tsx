import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { listBoard, listOwners, parseDealParams } from "@/lib/deals";
import { canManage } from "@/lib/permissions";
import { DealBoard } from "./deal-board";
import { StagesProvider } from "@/components/deals/stages-context";
import { listStages } from "@/lib/stages";

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
  const [stages, owners] = await Promise.all([listStages(), listOwners()]);
  const { deals, summary } = await listBoard({ ...params, userId: user.id }, stages.map((s) => s.id));
  return (
    <StagesProvider stages={stages}>
      <DealBoard key={JSON.stringify(params)} deals={deals} summary={summary} owners={owners} canManage={canManage(user)} />
    </StagesProvider>
  );
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
