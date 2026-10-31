"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "./brand";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ unreadBadge, tasksBadge }: { unreadBadge?: ReactNode; tasksBadge?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="เปิดเมนู">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" aria-describedby={undefined}>
        <SheetTitle className="sr-only">เมนู</SheetTitle>
        <div className="flex h-16 items-center px-5">
          <BrandMark />
        </div>
        <div className="flex flex-1 flex-col pt-4 pb-6">
          <SidebarNav unreadBadge={unreadBadge} tasksBadge={tasksBadge} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
