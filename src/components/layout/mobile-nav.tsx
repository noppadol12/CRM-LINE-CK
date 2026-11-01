"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** เมนูทั้งหมดแบบแผ่นเลื่อนจากซ้าย (มือถือ) — ปุ่มเปิดอยู่ที่แถบล่าง */
export function MobileNav({ unreadBadge, tasksBadge, trigger }: { unreadBadge?: ReactNode; tasksBadge?: ReactNode; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" aria-describedby={undefined} className="pt-safe">
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
