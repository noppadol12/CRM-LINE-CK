"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const linkCls = (disabled: boolean) =>
    cn(buttonVariants({ variant: "outline", size: "sm" }), disabled && "pointer-events-none opacity-50");

  return (
    <div className="flex items-center gap-2">
      <Link href={href(page - 1)} aria-disabled={page <= 1} className={linkCls(page <= 1)} scroll={false}>
        <ChevronLeft />
        ก่อนหน้า
      </Link>
      <span className="px-1 text-sm whitespace-nowrap">
        หน้า {page} / {pageCount}
      </span>
      <Link href={href(page + 1)} aria-disabled={page >= pageCount} className={linkCls(page >= pageCount)} scroll={false}>
        ถัดไป
        <ChevronRight />
      </Link>
    </div>
  );
}
