import { LayoutDashboard, Users, MessagesSquare, Gift, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** แสดง badge จำนวนแชทรอตอบ */
  showUnread?: boolean;
};

export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/chats", label: "แชท", icon: MessagesSquare, showUnread: true },
  { href: "/points", label: "แต้มสะสม", icon: Gift },
];

export const NAV_FOOTER: NavItem[] = [{ href: "/settings", label: "ตั้งค่า", icon: Settings }];

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  [...NAV_MAIN, ...NAV_FOOTER].map((i) => [i.href, i.label]),
);
