"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NAV_FOOTER, NAV_MAIN, type NavItem } from "./nav-config";

function NavLink({ item, badge, onNavigate }: { item: NavItem; badge?: ReactNode; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary-soft text-primary-soft-foreground"
          : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1">{item.label}</span>
      {item.showUnread && badge}
    </Link>
  );
}

export function SidebarNav({ unreadBadge, onNavigate }: { unreadBadge?: ReactNode; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 px-3">
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">เมนูหลัก</p>
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href} item={item} badge={unreadBadge} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto space-y-1">
        {NAV_FOOTER.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
