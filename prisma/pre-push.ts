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
