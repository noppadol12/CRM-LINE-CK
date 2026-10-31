import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandMark } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { TasksBadge, UnreadBadge } from "./unread-badge";
import { UserMenu } from "./user-menu";

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="size-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <BrandMark />
      </div>
      <div className="flex flex-1 flex-col pt-4 pb-4">
        <SidebarNav
          unreadBadge={
            <Suspense>
              <UnreadBadge />
            </Suspense>
          }
          tasksBadge={
            <Suspense>
              <TasksBadge />
            </Suspense>
          }
        />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </aside>
  );
}
