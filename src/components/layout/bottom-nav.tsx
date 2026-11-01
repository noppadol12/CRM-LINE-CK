"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, ListChecks, Menu, MessagesSquare, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";

type Tab = { href: string; label: string; icon: LucideIcon; badge?: "unread" | "tasks" };
const TABS: Tab[] = [
  { href: "/chats", label: "แชท", icon: MessagesSquare, badge: "unread" },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/deals", label: "ดีล", icon: Handshake },
  { href: "/tasks", label: "งาน", icon: ListChecks, badge: "tasks" },
];

type Props = { unreadBadge?: ReactNode; tasksBadge?: ReactNode };

function Bar({ pathname, unreadBadge, tasksBadge }: Props & { pathname: string | null }) {
  const active = (href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
  const onMain = TABS.some((t) => active(t.href));
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {TABS.map((t) => {
          const on = active(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn("relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium", on ? "text-primary" : "text-muted-foreground")}
            >
              <span className="relative">
                <t.icon className={cn("size-[22px]", on && "stroke-[2.25]")} />
                {t.badge && (
                  <span className="absolute -top-1.5 left-3.5 scale-90">{t.badge === "unread" ? unreadBadge : tasksBadge}</span>
                )}
              </span>
              {t.label}
              {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
            </Link>
          );
        })}
        <MobileNav
          unreadBadge={unreadBadge}
          tasksBadge={tasksBadge}
          trigger={
            <button
              type="button"
              className={cn("flex flex-col items-center justify-center gap-1 text-[11px] font-medium", onMain ? "text-muted-foreground" : "text-primary")}
            >
              <Menu className="size-[22px]" />
              เมนู
            </button>
          }
        />
      </div>
    </nav>
  );
}

function ActiveBar(props: Props) {
  return <Bar {...props} pathname={usePathname()} />;
}

/** แถบเมนูล่างจอสำหรับมือถือ (เหมือนแอป) */
export function BottomNav(props: Props) {
  return (
    <Suspense fallback={<Bar {...props} pathname={null} />}>
      <ActiveBar {...props} />
    </Suspense>
  );
}
