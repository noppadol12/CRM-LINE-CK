import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * แอปรันบน serverless → ใช้ "pooled connection" (Supabase pooler)
 * รองรับทั้งชื่อตัวแปรจาก Vercel × Supabase integration และแบบตั้งเอง
 */
function resolveConnectionString(): string {
  const raw =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;
  if (!raw) throw new Error("Missing DATABASE_URL / POSTGRES_PRISMA_URL");

  // ตัด query params ที่ node-postgres ไม่ใช้ / ทำให้ SSL ของ Supabase ตรวจ cert ไม่ผ่าน
  const url = new URL(raw);
  for (const p of ["sslmode", "pgbouncer", "supa", "connect_timeout"]) {
    url.searchParams.delete(p);
  }
  return url.toString();
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: resolveConnectionString(),
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
