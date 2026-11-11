"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function MonthPicker({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      <select
        value={value}
        aria-label="เลือกเดือน"
        onChange={(e) => {
          const v = e.target.value;
          start(() => router.replace(v === options[0]?.value ? pathname : `${pathname}?m=${v}`, { scroll: false }));
        }}
        className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
