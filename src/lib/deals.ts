import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BOARD_PAGE_SIZE,
  CLOSED_RANGES,
  CLOSED_STAGES,
  DEFAULT_CLOSED_RANGE,
  STALE_DAYS,
  isClosedStage,
  type ClosedRange,
} from "@/lib/deal-stages";

export type DealFilters = {
  q?: string;
  owner?: "me" | string;
  /** ช่วงเวลาของคอลัมน์ที่ปิดแล้ว (ค้นหาจะดูทั้งหมดเสมอ) */
  closed?: ClosedRange;
  /** เฉพาะดีลที่ค้างนาน */
  stale?: boolean;
  userId: string;
};

export function parseDealParams(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const closed = one("closed");
  return {
    q: one("q")?.trim().slice(0, 100) || undefined,
    owner: one("owner") || undefined,
    closed: (CLOSED_RANGES.some((r) => r.value === closed) ? closed : DEFAULT_CLOSED_RANGE) as ClosedRange,
    stale: one("stale") === "1",
  };
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

/** เงื่อนไขร่วมของบอร์ด (ไม่รวมขั้น) */
function boardWhere(f: DealFilters): Prisma.DealWhereInput[] {
  const and: Prisma.DealWhereInput[] = [{ customer: { deletedAt: null } }];
  // ค้นหา = ดูดีลเก่าทั้งหมด ไม่จำกัดช่วงเวลา
  if (!f.q && f.closed && f.closed !== "all") {
    const since = new Date(Date.now() - Number(f.closed) * 86_400_000);
    and.push({ OR: [{ stage: { notIn: CLOSED_STAGES } }, { closedAt: { gte: since } }] });
  }
  if (f.stale) {
    and.push({ stage: { notIn: CLOSED_STAGES }, stageChangedAt: { lt: new Date(Date.now() - STALE_DAYS * 86_400_000) } });
  }
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
        { customer: { phone: { contains: f.q } } },
      ],
    });
  }
  return and;
}

function stageOrder(stage: string): Prisma.DealOrderByWithRelationInput[] {
  return isClosedStage(stage)
    ? [{ closedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }]
    : [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }, { id: "asc" }];
}

/** ดีลของขั้นหนึ่ง ทีละหน้า */
export async function listStageDeals(f: DealFilters, stage: string, offset = 0, take = BOARD_PAGE_SIZE) {
  const rows = await prisma.deal.findMany({
    where: { AND: [...boardWhere(f), { stage }] },
    orderBy: stageOrder(stage),
    include: dealInclude,
    skip: offset,
    take,
  });
  return rows.map(toDealDTO);
}

export type StageSummary = { count: number; total: number; stale: number };

/** บอร์ด: การ์ดหน้าแรกของทุกขั้น + จำนวน/มูลค่ารวมจริงของแต่ละขั้น */
export async function listBoard(f: DealFilters, stageIds: string[]) {
  const where = { AND: boardWhere(f) };
  const staleSince = new Date(Date.now() - STALE_DAYS * 86_400_000);
  const [groups, staleGroups, pages] = await Promise.all([
    prisma.deal.groupBy({ by: ["stage"], where, _count: { _all: true }, _sum: { amount: true } }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { AND: [...boardWhere({ ...f, stale: false }), { stage: { notIn: CLOSED_STAGES }, stageChangedAt: { lt: staleSince } }] },
      _count: { _all: true },
    }),
    Promise.all(stageIds.map((id) => listStageDeals(f, id))),
  ]);
  const summary: Record<string, StageSummary> = {};
  for (const id of stageIds) summary[id] = { count: 0, total: 0, stale: 0 };
  for (const g of groups) summary[g.stage] = { ...(summary[g.stage] ?? { stale: 0 }), count: g._count._all, total: Number(g._sum.amount ?? 0) };
  for (const g of staleGroups) if (summary[g.stage]) summary[g.stage].stale = g._count._all;
  return { deals: pages.flat(), summary };
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
