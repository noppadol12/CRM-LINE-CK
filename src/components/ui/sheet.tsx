"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipeDismiss } from "@/lib/use-swipe-dismiss";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;

function SheetContent({
  className,
  children,
  side = "left",
  ref,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "left" | "right" | "bottom" }) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  // ปัดไปทางที่แผ่นเข้ามาเพื่อปิด (ล่าง = ปัดลง, ซ้าย = ปัดซ้าย)
  useSwipeDismiss(node, { axis: side === "left" ? "left" : "down", enabled: side !== "right", mediaQuery: side === "left" ? "(max-width: 1023.98px)" : undefined });
  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      setNode(el);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="ck-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
      <SheetPrimitive.Content
        ref={setRef}
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col bg-sidebar shadow-lg",
          side === "bottom" ? "ck-sheet-bottom" : side === "left" ? "ck-sheet-left" : "ck-sheet-right",
          side === "bottom"
            ? "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t bg-card pb-safe"
            : cn("inset-y-0 h-full w-72", side === "left" ? "left-0 border-r" : "right-0 border-l"),
          className,
        )}
        {...props}
      >
        {side === "bottom" && <span aria-hidden className="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30" />}
        {children}
        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X className="size-4" />
          <span className="sr-only">ปิด</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle };
