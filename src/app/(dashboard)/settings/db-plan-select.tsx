"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setDbPlan } from "@/actions/storage";

export function DbPlanSelect({ value, disabled }: { value: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={disabled || pending}
      aria-label="แพ็กเกจ Supabase"
      onChange={(e) =>
        start(async () => {
          const r = await setDbPlan(e.target.value);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
      className="h-8 rounded-md border border-input bg-card px-2 text-sm outline-none disabled:opacity-60"
    >
      <option value="free">Free · 500 MB</option>
      <option value="pro">Pro · 8 GB</option>
    </select>
  );
}
