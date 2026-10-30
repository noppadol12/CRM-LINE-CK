import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "แชท · CK CRM" };

export default function ChatsPage({ searchParams }: PageProps<"/chats">) {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <Inbox searchParams={searchParams} />
    </Suspense>
  );
}

function InboxSkeleton() {
  return (
    <div className="grid h-[calc(100svh-6rem)] overflow-hidden rounded-xl border bg-card sm:h-[calc(100svh-7rem)] lg:h-[calc(100svh-8rem)] lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px]">
      <div className="space-y-3 border-r p-4">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:block" />
    </div>
  );
}
