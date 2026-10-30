import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 20;

export type CustomerFilters = {
  q?: string;
  tag?: string;
  status?: "following" | "unfollowed" | "manual";
  trash?: boolean;
  page?: number;
};

/** อ่าน filter จาก URL searchParams แบบปลอดภัย */
export function parseFilters(sp: Record<string, string | string[] | undefined>): CustomerFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const status = one("status");
  const page = Number(one("page") ?? 1);
  return {
    q: one("q")?.trim().slice(0, 100) || undefined,
    tag: one("tag") || undefined,
    status: status === "following" || status === "unfollowed" || status === "manual" ? status : undefined,
    trash: one("view") === "trash",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function buildWhere(f: CustomerFilters): Prisma.CustomerWhereInput {
  const and: Prisma.CustomerWhereInput[] = [{ deletedAt: f.trash ? { not: null } : null }];

  if (f.q) {
    const or: Prisma.CustomerWhereInput[] = [
      { fullName: { contains: f.q, mode: "insensitive" } },
      { lineName: { contains: f.q, mode: "insensitive" } },
      { company: { contains: f.q, mode: "insensitive" } },
      { email: { contains: f.q, mode: "insensitive" } },
    ];
    const digits = f.q.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ phone: { contains: digits } });
    and.push({ OR: or });
  }
  if (f.tag) and.push({ tags: { some: { tagId: f.tag } } });
  if (f.status === "following") and.push({ followStatus: "FOLLOWING" });
  if (f.status === "unfollowed") and.push({ followStatus: "UNFOLLOWED" });
  if (f.status === "manual") and.push({ lineUserId: null });

  return { AND: and };
}

export async function listCustomers(f: CustomerFilters) {
  const where = buildWhere(f);
  const page = f.page ?? 1;
  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: f.trash ? { deletedAt: "desc" } : [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        lineUserId: true,
        lineName: true,
        fullName: true,
        pictureUrl: true,
        phone: true,
        email: true,
        company: true,
        address: true,
        followStatus: true,
        pointBalance: true,
        lastMessageAt: true,
        unreadCount: true,
        deletedAt: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } }, orderBy: { assignedAt: "asc" } },
      },
    }),
  ]);
  return { total, rows, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type CustomerRow = Awaited<ReturnType<typeof listCustomers>>["rows"][number];

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true }, orderBy: { assignedAt: "asc" } },
      assignedTo: { select: { id: true, name: true } },
      notes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true } } },
      },
      pointTransactions: { orderBy: { createdAt: "desc" }, take: 5 },
      messages: { orderBy: { sentAt: "desc" }, take: 5 },
      _count: { select: { messages: true, pointTransactions: true } },
    },
  });
}

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

export function listTags() {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, _count: { select: { customers: true } } },
  });
}

export type TagWithCount = Awaited<ReturnType<typeof listTags>>[number];
