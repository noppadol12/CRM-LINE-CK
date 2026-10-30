import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CLOSED_STAGES } from "@/lib/deal-stages";

const CLOSED_WINDOW_DAYS = 30; // คอลัมน์ "ปิดได้ / ไม่ซื้อ" แสดงเฉพาะ 30 วันล่าสุด

export type DealFilters = { q?: string; owner?: "me" | string; userId: string };

export function parseDealParams(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  return { q: one("q")?.trim().slice(0, 100) || undefined, owner: one("owner") || undefined };
}

const dealInclude = {
  customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true, pictureUrl: true, phone: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;

type DealRow = Prisma.DealGetPayload<{ include: typeof dealInclude }>;

/** แปลงเป็นข้อมูลที่ส่งให้ client ได้ (Decimal → number) */
export function toDealDTO(d: DealRow) {
  return {
    id: d.id,
    title: d.title,
    items: d.items,
    amount: d.amount == null ? null : Number(d.amount),
    stage: d.stage,
    quoteNo: d.quoteNo,
    nextFollowUpAt: d.nextFollowUpAt,
    expectedCloseDate: d.expectedCloseDate,
    lostReason: d.lostReason,
    stageChangedAt: d.stageChangedAt,
    closedAt: d.closedAt,
    updatedAt: d.updatedAt,
    owner: d.owner,
    customer: d.customer,
  };
}

export type DealDTO = ReturnType<typeof toDealDTO>;

export async function listBoardDeals(f: DealFilters) {
  const since = new Date(Date.now() - CLOSED_WINDOW_DAYS * 86_400_000);
  const and: Prisma.DealWhereInput[] = [
    { customer: { deletedAt: null } },
    { OR: [{ stage: { notIn: CLOSED_STAGES } }, { closedAt: { gte: since } }] },
  ];
  if (f.owner === "me") and.push({ ownerId: f.userId });
  else if (f.owner) and.push({ ownerId: f.owner });
  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { items: { contains: f.q, mode: "insensitive" } },
        { quoteNo: { contains: f.q, mode: "insensitive" } },
        { customer: { fullName: { contains: f.q, mode: "insensitive" } } },
        { customer: { lineName: { contains: f.q, mode: "insensitive" } } },
        { customer: { company: { contains: f.q, mode: "insensitive" } } },
      ],
    });
  }
  const rows = await prisma.deal.findMany({
    where: { AND: and },
    orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    include: dealInclude,
    take: 500,
  });
  return rows.map(toDealDTO);
}

export async function listCustomerDeals(customerId: string) {
  const rows = await prisma.deal.findMany({
    where: { customerId },
    orderBy: [{ closedAt: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
    include: dealInclude,
  });
  return rows.map(toDealDTO);
}

export function listOwners() {
  return prisma.adminUser.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/** ดีลที่ถึงกำหนดติดตาม (วันนี้หรือเลยกำหนด) ตามเวลาไทย */
export async function listDueFollowUps(limit = 6) {
  const endOfTodayBkk = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())}T23:59:59.999+07:00`);
  const rows = await prisma.deal.findMany({
    where: { stage: { notIn: CLOSED_STAGES }, nextFollowUpAt: { lte: endOfTodayBkk }, customer: { deletedAt: null } },
    orderBy: { nextFollowUpAt: "asc" },
    take: limit,
    include: dealInclude,
  });
  return rows.map(toDealDTO);
}
