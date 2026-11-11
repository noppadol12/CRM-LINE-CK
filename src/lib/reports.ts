import "server-only";
import { prisma } from "@/lib/prisma";
import { openStages } from "@/lib/stages";

/**
 * รายงานทั้งหมดคิดตามเวลาไทย (UTC+7)
 * คอลัมน์เวลาใน DB เก็บเป็น UTC (timestamp without time zone) → บวก 7 ชม. ก่อนตัดวัน/เดือน
 */

export const PERIODS = [
  { key: "30", label: "30 วัน", days: 30 },
  { key: "90", label: "90 วัน", days: 90 },
  { key: "180", label: "6 เดือน", days: 180 },
  { key: "365", label: "1 ปี", days: 365 },
] as const;

export function parsePeriod(sp: Record<string, string | string[] | undefined>) {
  const v = Array.isArray(sp.p) ? sp.p[0] : sp.p;
  return PERIODS.find((p) => p.key === v) ?? PERIODS[1];
}

const num = (v: unknown) => (v == null ? 0 : Number(v));

/** ยอดปิดการขายรายเดือน 12 เดือนล่าสุด (รวมเดือนที่เป็น 0) */
export async function wonByMonth() {
  const rows = await prisma.$queryRaw<{ month: string; amount: unknown; deals: unknown }[]>`
    WITH months AS (
      SELECT to_char(m, 'YYYY-MM') AS month
      FROM generate_series(
        date_trunc('month', (now() at time zone 'UTC') + interval '7 hours') - interval '11 months',
        date_trunc('month', (now() at time zone 'UTC') + interval '7 hours'),
        interval '1 month') AS m
    )
    SELECT months.month, COALESCE(SUM(d.amount), 0) AS amount, COUNT(d.id) AS deals
    FROM months
    LEFT JOIN deals d
      ON d.stage = 'WON' AND to_char(d."closedAt" + interval '7 hours', 'YYYY-MM') = months.month
    GROUP BY months.month ORDER BY months.month`;
  return rows.map((r) => ({ month: r.month, amount: num(r.amount), deals: num(r.deals) }));
}

/** ตัวเลขสรุปของช่วงเวลา */
export async function periodSummary(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [won, lost, newCustomers] = await Promise.all([
    prisma.deal.aggregate({ where: { stage: "WON", closedAt: { gte: since } }, _sum: { amount: true }, _count: true, _avg: { amount: true } }),
    prisma.deal.count({ where: { stage: "LOST", closedAt: { gte: since } } }),
    prisma.customer.count({ where: { createdAt: { gte: since }, deletedAt: null, chatType: "user" } }),
  ]);
  const cycle = await prisma.$queryRaw<{ days: unknown }[]>`
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY GREATEST(0, EXTRACT(EPOCH FROM ("closedAt" - "createdAt")) / 86400)) AS days
    FROM deals WHERE stage = 'WON' AND "closedAt" >= ${since}`;

  const closed = won._count + lost;
  return {
    wonAmount: num(won._sum.amount),
    wonCount: won._count,
    lostCount: lost,
    winRate: closed > 0 ? won._count / closed : null,
    avgDeal: won._avg.amount == null ? null : num(won._avg.amount),
    medianDaysToClose: cycle[0]?.days == null ? null : num(cycle[0].days),
    newCustomers,
  };
}

/** ดีลที่เปิดอยู่ตอนนี้ แยกตามขั้น (ตามลำดับขั้นที่ตั้งไว้) */
export async function pipelineSnapshot() {
  const stages = await openStages();
  const rows = await prisma.deal.groupBy({
    by: ["stage"],
    where: { stage: { in: stages.map((s) => s.id) }, customer: { deletedAt: null } },
    _sum: { amount: true },
    _count: true,
  });
  return stages.map((stage) => {
    const r = rows.find((x) => x.stage === stage.id);
    return { stage: stage.id, name: stage.name, amount: num(r?._sum.amount), deals: r?._count ?? 0 };
  });
}

/** สาเหตุที่ลูกค้าไม่ซื้อ */
export async function lostReasons(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.deal.groupBy({
    by: ["lostReason"],
    where: { stage: "LOST", closedAt: { gte: since } },
    _count: true,
    _sum: { amount: true },
    orderBy: { _count: { lostReason: "desc" } },
  });
  return rows.map((r) => ({ reason: r.lostReason?.trim() || "ไม่ระบุ", deals: r._count, amount: num(r._sum.amount) }));
}

/** ข้อความลูกค้าทักเข้า และลูกค้าใหม่ รายวัน */
export async function dailyActivity(days: number) {
  const rows = await prisma.$queryRaw<{ day: string; inbound: unknown; customers: unknown; newCustomers: unknown }[]>`
    WITH d AS (
      SELECT generate_series(
        ((now() at time zone 'UTC') + interval '7 hours')::date - (${days}::int - 1),
        ((now() at time zone 'UTC') + interval '7 hours')::date,
        interval '1 day')::date AS day
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT COUNT(*) FROM chat_messages m
        WHERE m.direction = 'INBOUND' AND (m."sentAt" + interval '7 hours')::date = d.day) AS inbound,
      (SELECT COUNT(DISTINCT m."customerId") FROM chat_messages m
        WHERE m.direction = 'INBOUND' AND (m."sentAt" + interval '7 hours')::date = d.day) AS customers,
      (SELECT COUNT(*) FROM customers c
        WHERE c."deletedAt" IS NULL AND c."chatType" = 'user' AND (c."createdAt" + interval '7 hours')::date = d.day) AS "newCustomers"
    FROM d ORDER BY d.day`;
  return rows.map((r) => ({ day: r.day, inbound: num(r.inbound), customers: num(r.customers), newCustomers: num(r.newCustomers) }));
}

/**
 * เวลาตอบแชท: นับจากข้อความแรกของลูกค้าในแต่ละรอบ (ก่อนหน้าเป็นข้อความของร้าน หรือเป็นข้อความแรก)
 * ถึงข้อความแรกที่ร้านตอบผ่านระบบนี้
 */
export async function responseTimes(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.$queryRaw<{ median: unknown; p90: unknown; answered: unknown; waiting: unknown }[]>`
    WITH m AS (
      SELECT cm."customerId", cm.direction, cm."sentAt",
        lag(cm.direction) OVER (PARTITION BY cm."customerId" ORDER BY cm."sentAt") AS prev
      FROM chat_messages cm
      JOIN customers c ON c.id = cm."customerId" AND c."chatType" = 'user' -- ไม่นับแชทกลุ่ม (สมาชิกคุยกันเอง)
    ),
    starts AS (
      SELECT "customerId", "sentAt" FROM m
      WHERE direction = 'INBOUND' AND (prev IS NULL OR prev = 'OUTBOUND') AND "sentAt" >= ${since}
    ),
    resp AS (
      SELECT s."sentAt" AS asked,
        (SELECT MIN(o."sentAt") FROM chat_messages o
          WHERE o."customerId" = s."customerId" AND o.direction = 'OUTBOUND' AND o."sentAt" > s."sentAt") AS answered
      FROM starts s
    )
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (answered - asked)) / 60) FILTER (WHERE answered IS NOT NULL) AS median,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (answered - asked)) / 60) FILTER (WHERE answered IS NOT NULL) AS p90,
      COUNT(*) FILTER (WHERE answered IS NOT NULL) AS answered,
      COUNT(*) FILTER (WHERE answered IS NULL) AS waiting
    FROM resp`;
  const r = rows[0];
  return {
    medianMinutes: r?.median == null ? null : num(r.median),
    p90Minutes: r?.p90 == null ? null : num(r.p90),
    answered: num(r?.answered),
    waiting: num(r?.waiting),
  };
}

/** ผลงานรายคน (ผู้ดูแลดีล) */
export async function ownerPerformance(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.$queryRaw<
    { id: string | null; name: string | null; won: unknown; wonAmount: unknown; lost: unknown; open: unknown; openAmount: unknown }[]
  >`
    SELECT a.id, a.name,
      COUNT(*) FILTER (WHERE d.stage = 'WON' AND d."closedAt" >= ${since}) AS won,
      COALESCE(SUM(d.amount) FILTER (WHERE d.stage = 'WON' AND d."closedAt" >= ${since}), 0) AS "wonAmount",
      COUNT(*) FILTER (WHERE d.stage = 'LOST' AND d."closedAt" >= ${since}) AS lost,
      COUNT(*) FILTER (WHERE d.stage NOT IN ('WON', 'LOST')) AS open,
      COALESCE(SUM(d.amount) FILTER (WHERE d.stage NOT IN ('WON', 'LOST')), 0) AS "openAmount"
    FROM deals d LEFT JOIN admin_users a ON a.id = d."ownerId"
    GROUP BY a.id, a.name
    ORDER BY "wonAmount" DESC, open DESC`;
  return rows
    .map((r) => {
      const won = num(r.won);
      const lost = num(r.lost);
      return {
        id: r.id ?? "none",
        name: r.name ?? "ไม่ระบุผู้ดูแล",
        won,
        wonAmount: num(r.wonAmount),
        lost,
        winRate: won + lost > 0 ? won / (won + lost) : null,
        open: num(r.open),
        openAmount: num(r.openAmount),
      };
    })
    .filter((r) => r.won + r.lost + r.open > 0);
}

export type MonthSales = {
  month: string; // YYYY-MM (เวลาไทย)
  opened: number; // มูลค่าดีลที่เปิดในเดือนนั้น
  openedDeals: number;
  won: number; // ในจำนวนนั้น ปิดการขายได้
  wonDeals: number;
  lost: number;
  lostDeals: number;
  pending: number; // ยังไม่ปิด
  pendingDeals: number;
  wonInMonth: number; // ยอดปิดการขายที่เกิดในเดือนนั้นทั้งหมด (รวมดีลที่เปิดจากเดือนก่อน)
  wonInMonthDeals: number;
};

/**
 * สัดส่วนดีลรายเดือน 12 เดือนล่าสุด: ดีลที่ "เปิด" ในเดือนนั้น ปิดได้กี่บาท / กี่ %
 * + ยอดปิดการขายจริงที่เกิดในเดือนนั้น
 */
export async function monthlySales(): Promise<MonthSales[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    WITH months AS (
      SELECT to_char(m, 'YYYY-MM') AS month
      FROM generate_series(
        date_trunc('month', (now() at time zone 'UTC') + interval '7 hours') - interval '11 months',
        date_trunc('month', (now() at time zone 'UTC') + interval '7 hours'),
        interval '1 month') AS m
    ),
    live AS (
      SELECT d.* FROM deals d JOIN customers c ON c.id = d."customerId" WHERE c."deletedAt" IS NULL
    ),
    cohort AS (
      SELECT to_char(d."createdAt" + interval '7 hours', 'YYYY-MM') AS month,
        COALESCE(SUM(d.amount), 0) AS opened, COUNT(*) AS opened_deals,
        COALESCE(SUM(d.amount) FILTER (WHERE d.stage = 'WON'), 0) AS won, COUNT(*) FILTER (WHERE d.stage = 'WON') AS won_deals,
        COALESCE(SUM(d.amount) FILTER (WHERE d.stage = 'LOST'), 0) AS lost, COUNT(*) FILTER (WHERE d.stage = 'LOST') AS lost_deals
      FROM live d GROUP BY 1
    ),
    closed AS (
      SELECT to_char(d."closedAt" + interval '7 hours', 'YYYY-MM') AS month, COALESCE(SUM(d.amount), 0) AS won_in_month, COUNT(*) AS won_in_month_deals
      FROM live d WHERE d.stage = 'WON' AND d."closedAt" IS NOT NULL GROUP BY 1
    )
    SELECT months.month,
      COALESCE(cohort.opened, 0) AS opened, COALESCE(cohort.opened_deals, 0) AS opened_deals,
      COALESCE(cohort.won, 0) AS won, COALESCE(cohort.won_deals, 0) AS won_deals,
      COALESCE(cohort.lost, 0) AS lost, COALESCE(cohort.lost_deals, 0) AS lost_deals,
      COALESCE(closed.won_in_month, 0) AS won_in_month, COALESCE(closed.won_in_month_deals, 0) AS won_in_month_deals
    FROM months
    LEFT JOIN cohort ON cohort.month = months.month
    LEFT JOIN closed ON closed.month = months.month
    ORDER BY months.month`;
  return rows.map((r) => {
    const opened = num(r.opened);
    const won = num(r.won);
    const lost = num(r.lost);
    const openedDeals = num(r.opened_deals);
    const wonDeals = num(r.won_deals);
    const lostDeals = num(r.lost_deals);
    return {
      month: String(r.month),
      opened,
      openedDeals,
      won,
      wonDeals,
      lost,
      lostDeals,
      pending: Math.max(0, opened - won - lost),
      pendingDeals: Math.max(0, openedDeals - wonDeals - lostDeals),
      wonInMonth: num(r.won_in_month),
      wonInMonthDeals: num(r.won_in_month_deals),
    };
  });
}
