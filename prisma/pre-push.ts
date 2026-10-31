/**
 * รันก่อน `prisma db push` ทุกครั้งที่ deploy
 *
 * `db push` จะหยุด build เองถ้าการเปลี่ยน schema ทำให้ข้อมูลหาย (ป้องกันพลาด)
 * การลบที่ "ตั้งใจ" จึงต้องเขียนไว้ที่นี่ให้ชัดเจน แต่ละขั้นต้องรันซ้ำได้ (IF EXISTS)
 */
import "dotenv/config";
import { Client } from "pg";
import { getDirectUrl } from "../src/lib/db-url";

const STEPS: { name: string; sql: string }[] = [
  {
    // 2026-10-30: ยกเลิกระบบแต้มสะสม (ใช้ระบบดีลแทน)
    name: "drop points system",
    sql: `
      DROP TABLE IF EXISTS point_transactions;
      ALTER TABLE IF EXISTS customers DROP COLUMN IF EXISTS "pointBalance";
      DROP TYPE IF EXISTS "PointTransactionType";
    `,
  },
  {
    // 2026-10-31: ขั้นดีลกำหนดเองได้ — enum DealStage → ตาราง deal_stages (id เดิมเป็น id ของขั้นเริ่มต้น ข้อมูลไม่หาย)
    name: "custom deal stages",
    sql: `
      CREATE TABLE IF NOT EXISTS deal_stages (
        id text NOT NULL,
        name text NOT NULL,
        color text NOT NULL DEFAULT 'slate',
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT deal_stages_pkey PRIMARY KEY (id)
      );
      INSERT INTO deal_stages (id, name, color, "sortOrder") VALUES
        ('INQUIRY', 'สอบถาม', 'slate', 10),
        ('QUOTED', 'เสนอราคาแล้ว', 'sky', 20),
        ('AWAITING_PAYMENT', 'รอโอนเงิน', 'amber', 30),
        ('SHIPPING', 'เตรียม/จัดส่ง', 'violet', 40),
        ('WON', 'ปิดการขาย', 'emerald', 1000),
        ('LOST', 'ไม่ซื้อ', 'rose', 1001)
      ON CONFLICT (id) DO NOTHING;
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'deals' AND column_name = 'stage' AND udt_name = 'DealStage') THEN
          ALTER TABLE deals ALTER COLUMN stage DROP DEFAULT;
          ALTER TABLE deals ALTER COLUMN stage TYPE text USING stage::text;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'deal_events' AND column_name = 'fromStage' AND udt_name = 'DealStage') THEN
          ALTER TABLE deal_events ALTER COLUMN "fromStage" TYPE text USING "fromStage"::text;
          ALTER TABLE deal_events ALTER COLUMN "toStage" TYPE text USING "toStage"::text;
        END IF;
      END $$;
      DROP TYPE IF EXISTS "DealStage";
    `,
  },
];

async function main() {
  const raw = getDirectUrl();
  if (!raw) throw new Error("ไม่พบ connection string ของฐานข้อมูล");
  const url = new URL(raw);
  for (const p of ["sslmode", "pgbouncer", "supa", "connect_timeout"]) url.searchParams.delete(p);
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);

  const client = new Client({ connectionString: url.toString(), ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const step of STEPS) {
      await client.query(step.sql);
      console.log(`pre-push: ${step.name} ✓`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("pre-push failed", e);
  process.exit(1);
});
