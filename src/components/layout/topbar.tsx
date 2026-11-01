import { Suspense } from "react";
import Form from "next/form";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { UserMenu } from "./user-menu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur sm:h-16 sm:px-6">
      <Link href="/dashboard" className="shrink-0 lg:hidden" aria-label="หน้าแรก">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">CK</span>
      </Link>

      <Form action="/search" className="relative flex max-w-md flex-1 items-center" role="search">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <input
          type="search"
          name="q"
          placeholder="ค้นหาลูกค้า เบอร์ ข้อความ…"
          aria-label="ค้นหา"
          className="h-9 w-full rounded-lg border border-transparent bg-muted pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-card"
        />
      </Form>

      <div className="ml-auto lg:hidden">
        <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
          <UserMenu compact />
        </Suspense>
      </div>
    </header>
  );
}
