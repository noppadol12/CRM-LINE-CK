/**
 * หา connection string ของ Postgres จาก environment
 * รองรับ: ตั้งเอง (DATABASE_URL / DIRECT_URL) และ Vercel × Supabase integration
 * ทั้งแบบไม่มีคำนำหน้า (POSTGRES_PRISMA_URL) และมีคำนำหน้า (เช่น STORAGE_POSTGRES_PRISMA_URL)
 * ไฟล์นี้ต้องไม่ import อะไรจาก Next.js เพราะ prisma.config.ts ใช้ด้วย
 */

function findBySuffix(suffix: string): string | undefined {
  if (process.env[suffix]) return process.env[suffix];
  const key = Object.keys(process.env).find((k) => k.endsWith(`_${suffix}`) && process.env[k]);
  return key ? process.env[key] : undefined;
}

/** สำหรับ prisma db push / migrate — ต้องไม่ผ่าน transaction pooler */
export function getDirectUrl(): string | undefined {
  return (
    process.env.DIRECT_URL ||
    findBySuffix("POSTGRES_URL_NON_POOLING") ||
    process.env.DATABASE_URL ||
    findBySuffix("POSTGRES_PRISMA_URL") ||
    findBySuffix("POSTGRES_URL")
  );
}

/** สำหรับแอปที่รันบน serverless — ใช้ pooler */
export function getPooledUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    findBySuffix("POSTGRES_PRISMA_URL") ||
    findBySuffix("POSTGRES_URL") ||
    findBySuffix("POSTGRES_URL_NON_POOLING") ||
    process.env.DIRECT_URL
  );
}

/** ข้อความอธิบายตอนหาไม่เจอ — แสดงเฉพาะ "ชื่อ" ตัวแปร ไม่แสดงค่า */
export function missingDbUrlMessage(): string {
  const related = Object.keys(process.env)
    .filter((k) => /POSTGRES|DATABASE|SUPABASE|DIRECT_URL/.test(k))
    .sort();
  return [
    "ไม่พบ connection string ของฐานข้อมูล",
    "ต้องมีอย่างน้อยหนึ่งตัว: DATABASE_URL, DIRECT_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING",
    `ตัวแปรที่เกี่ยวข้องที่พบในระบบ: ${related.length ? related.join(", ") : "(ไม่มีเลย)"}`,
    "วิธีแก้: Vercel → Storage → เชื่อม Supabase กับโปรเจกต์นี้ หรือเพิ่ม DATABASE_URL และ DIRECT_URL เองใน Settings → Environment Variables",
  ].join("\n");
}
