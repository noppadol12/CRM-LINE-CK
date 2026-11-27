"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { setFavorite } from "@/actions/favorites";
import { cn } from "@/lib/utils";

/** ปุ่มดาว — กดแล้วเปลี่ยนทันที (บันทึกเบื้องหลัง) */
export function FavoriteButton({ customerId, favorite, size = "md", className }: { customerId: string; favorite: boolean; size?: "sm" | "md"; className?: string }) {
  const [on, setOn] = useOptimistic(favorite);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      title={on ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          setOn(!on);
          const r = await setFavorite(customerId, !on);
          if (!r.ok) toast.error(r.error);
        });
      }}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-md hit-area transition-[color,background-color,scale] active:scale-90",
        size === "sm" ? "size-7" : "size-9",
        on ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <Star className={size === "sm" ? "size-4" : "size-[18px]"} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
