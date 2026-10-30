import { Suspense } from "react";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "./mobile-nav";
import { UnreadBadge } from "./unread-badge";
import { UserMenu } from "./user-menu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur sm:px-6">
      <MobileNav
        unreadBadge={
          <Suspense>
            <UnreadBadge />
          </Suspense>
        }
      />

      <label className="relative flex max-w-md flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="ค้นหาลูกค้า ชื่อ เบอร์โทร…"
          disabled
          title="เปิดใช้งานใน Phase 3"
          className="h-9 w-full rounded-lg border border-transparent bg-muted pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-card disabled:cursor-not-allowed"
        />
      </label>

      <div className="ml-auto lg:hidden">
        <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
          <UserMenu compact />
        </Suspense>
      </div>
    </header>
  );
}
