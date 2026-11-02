"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "สว่าง", icon: Sun },
  { value: "dark", label: "มืด", icon: Moon },
  { value: "system", label: "ตามเครื่อง", icon: Monitor },
];

/** ตัวเลือกธีม สว่าง / มืด / ตามเครื่อง (จำแยกแต่ละเครื่อง) */
export function ThemeToggle({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="ธีม" className={cn("grid grid-cols-3 rounded-md bg-muted p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={(e) => {
              e.preventDefault();
              setPref(value);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded transition-colors",
              size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
              on ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** ปุ่มสลับสว่าง ⇄ มืด แบบไอคอนเดียว */
export function ThemeIconButton({ className }: { className?: string }) {
  const { resolved, setPref } = useTheme();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={() => setPref(dark ? "light" : "dark")}
      aria-label={dark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      title={dark ? "ธีมสว่าง" : "ธีมมืด"}
      className={cn("flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", className)}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
