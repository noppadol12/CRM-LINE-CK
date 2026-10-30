import { cn } from "@/lib/utils";

export function BrandMark({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <div className={cn("relative flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold tracking-tight text-primary-foreground shadow-sm">
        CK
      </span>
      <span className="leading-tight">
        <span className={cn("block text-[15px] font-semibold", tone === "light" ? "text-white" : "text-foreground")}>
          CK CRM
        </span>
        <span className={cn("block text-xs", tone === "light" ? "text-white/60" : "text-muted-foreground")}>
          LINE OA Workspace
        </span>
      </span>
    </div>
  );
}
