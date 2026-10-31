"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_FOOTER, NAV_MAIN, type NavItem } from "./nav-config";

type Props = { unreadBadge?: ReactNode; tasksBadge?: ReactNode; onNavigate?: () => void };

function NavLink({
  item,
  active,
  badge,
  tasksBadge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge?: ReactNode;
  tasksBadge?: ReactNode;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-primary-soft text-primary-soft-foreground" : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1">{item.label}</span>
      {item.showUnread && badge}
      {item.showTasks && tasksBadge}
    </Link>
  );
}

function NavList({ pathname, unreadBadge, tasksBadge, onNavigate }: Props & { pathname: string | null }) {
  const isActive = (href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav className="flex flex-1 flex-col gap-6 px-3">
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">เมนูหลัก</p>
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} badge={unreadBadge} tasksBadge={tasksBadge} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto space-y-1">
        {NAV_FOOTER.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}

function ActiveNavList(props: Props) {
  return <NavList {...props} pathname={usePathname()} />;
}

/** อ่าน URL ได้หลัง Suspense เท่านั้น (Cache Components) — ระหว่างรอแสดงเมนูแบบไม่ไฮไลต์ */
export function SidebarNav(props: Props) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <ActiveNavList {...props} />
    </Suspense>
  );
}
