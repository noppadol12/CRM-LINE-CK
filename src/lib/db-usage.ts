import "server-only";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

/** แพ็กเกจ Supabase — ขนาดฐานข้อมูลที่รวมในแพ็กเกจ (ดู supabase.com/pricing) */
export const DB_PLANS = {
  free: { label: "Free", limitBytes: 500 * 1024 ** 2 },
  pro: { label: "Pro", limitBytes: 8 * 1024 ** 3 },
} as const;
export type DbPlan = keyof typeof DB_PLANS;

const LABELS: Record<string, string> = {
  chat_messages: "ข้อความแชท",
  webhook_events: "ประวัติ event จาก LINE",
  customers: "ลูกค้า",
  deals: "ดีล",
  deal_events: "ประวัติดีล",
  admin_notes: "โน้ตภายใน",
  shipments: "การส่งของ",
  tasks: "งานติดตาม",
  carrier_coverage: "พื้นที่ขนส่ง",
  carriers: "บริษัทขนส่ง",
  login_attempts: "ประวัติการล็อกอิน",
  quick_replies: "ข้อความตอบกลับด่วน",
  push_subscriptions: "อุปกรณ์รับแจ้งเตือน",
  app_settings: "ค่าตั้งค่าระบบ",
  customer_tags: "แท็กของลูกค้า",
  tags: "แท็ก",
  admin_users: "ทีมงาน",
  deal_stages: "ขั้นตอนดีล",
};

export async function dbPlan(): Promise<DbPlan> {
  const v = await getSetting<{ plan: DbPlan }>("db_plan");
  return v?.plan && v.plan in DB_PLANS ? v.plan : "free";
}

/** ขนาดฐานข้อมูลปัจจุบัน + ตารางที่ใหญ่สุด + อัตราการโตโดยประมาณ */
export async function dbUsage() {
  const [[db], tables, plan, msg30, msgTotal] = await Promise.all([
    prisma.$queryRaw<{ size: bigint }[]>`select pg_database_size(current_database()) as size`,
    prisma.$queryRaw<{ name: string; size: bigint; rows: bigint }[]>`
      select relname as name, pg_total_relation_size(relid) as size, n_live_tup as rows
      from pg_stat_user_tables where schemaname = 'public'
      order by pg_total_relation_size(relid) desc limit 6`,
    dbPlan(),
    prisma.chatMessage.count({ where: { sentAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
    prisma.chatMessage.count(),
  ]);
  const used = Number(db.size);
  const limit = DB_PLANS[plan].limitBytes;
  const msgTable = tables.find((t) => t.name === "chat_messages");
  // ประมาณการโต: ขนาดเฉลี่ยต่อข้อความ × ข้อความใน 30 วันล่าสุด (รวม event จาก LINE ที่มาคู่กัน)
  const eventTable = tables.find((t) => t.name === "webhook_events");
  const perMsg = msgTable && msgTotal > 0 ? (Number(msgTable.size) + Number(eventTable?.size ?? 0)) / msgTotal : 0;
  const monthlyGrowth = perMsg * msg30;
  const monthsLeft = monthlyGrowth > 0 ? Math.max(0, (limit - used) / monthlyGrowth) : null;
  return {
    plan,
    used,
    limit,
    pct: Math.min(100, (used / limit) * 100),
    tables: tables.map((t) => ({ name: t.name, label: LABELS[t.name] ?? t.name, size: Number(t.size), rows: Number(t.rows) })),
    msg30,
    monthlyGrowth,
    monthsLeft,
  };
}
