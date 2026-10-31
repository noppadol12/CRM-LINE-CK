import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type InboxFilter = "all" | "unread";

export function parseInboxParams(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const n = Number(one("n") ?? 50);
  return {
    selectedId: one("c") || null,
    q: one("q")?.trim().slice(0, 100) || undefined,
    filter: (one("f") === "unread" ? "unread" : "all") as InboxFilter,
    limit: Number.isFinite(n) ? Math.min(Math.max(50, Math.floor(n)), 500) : 50,
  };
}

export async function listConversations({ q, filter }: { q?: string; filter: InboxFilter }) {
  const and: Prisma.CustomerWhereInput[] = [{ deletedAt: null }, { lastMessageAt: { not: null } }];
  if (filter === "unread") and.push({ unreadCount: { gt: 0 } });
  if (q) {
    const or: Prisma.CustomerWhereInput[] = [
      { fullName: { contains: q, mode: "insensitive" } },
      { lineName: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { lastMessagePreview: { contains: q, mode: "insensitive" } },
    ];
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ phone: { contains: digits } });
    and.push({ OR: or });
  }

  return prisma.customer.findMany({
    where: { AND: and },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    select: {
      id: true,
      lineUserId: true,
      chatType: true,
      lineName: true,
      fullName: true,
      pictureUrl: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      unreadCount: true,
      followStatus: true,
      tags: { select: { tag: { select: { name: true, color: true } } }, take: 1, orderBy: { assignedAt: "asc" } },
    },
  });
}

export type Conversation = Awaited<ReturnType<typeof listConversations>>[number];

export async function getThread(customerId: string, limit: number) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      tags: { include: { tag: true }, orderBy: { assignedAt: "asc" } },
      notes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true } } },
      },
      _count: { select: { messages: true } },
    },
  });
  if (!customer) return null;

  const latest = await prisma.chatMessage.findMany({
    where: { customerId },
    orderBy: { sentAt: "desc" },
    take: limit,
    include: { sentBy: { select: { name: true } } },
  });

  return { customer, messages: latest.reverse(), hasMore: customer._count.messages > latest.length };
}

export type Thread = NonNullable<Awaited<ReturnType<typeof getThread>>>;
export type ThreadMessage = Thread["messages"][number];
