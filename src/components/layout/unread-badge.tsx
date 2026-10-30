import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** จำนวนลูกค้าที่มีข้อความรอตอบ — แสดงข้างเมนูแชท */
export async function UnreadBadge() {
  await getCurrentUser();
  const count = await prisma.customer.count({ where: { unreadCount: { gt: 0 }, deletedAt: null } });
  if (count === 0) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
