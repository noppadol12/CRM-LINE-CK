import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers, listTags, parseFilters, PAGE_SIZE } from "@/lib/customers";
import { canManage } from "@/lib/permissions";
import { thNumber } from "@/lib/utils";
import { CustomerFilters } from "./customer-filters";
import { CustomersTable } from "./customers-table";
import { Pagination } from "./pagination";

export async function CustomersSection({ searchParams }: { searchParams: PageProps<"/customers">["searchParams"] }) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const [{ rows, total, page, pageCount }, tags] = await Promise.all([listCustomers(filters), listTags()]);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const hasFilter = Boolean(filters.q || filters.tag || filters.status);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CustomerFilters tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))} canSeeTrash={canManage(user)} />
      <CustomersTable rows={rows} trash={!!filters.trash} canManage={canManage(user)} hasFilter={hasFilter} />
      <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row">
        <span>
          {total === 0 ? "ไม่พบรายการ" : `แสดง ${thNumber.format(from)}–${thNumber.format(to)} จาก ${thNumber.format(total)} ราย`}
        </span>
        <Pagination page={page} pageCount={pageCount} />
      </div>
    </Card>
  );
}

export function CustomersSectionSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap gap-3 border-b p-4">
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-64" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b px-4 py-3.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-5 w-32 md:block" />
        </div>
      ))}
    </Card>
  );
}
