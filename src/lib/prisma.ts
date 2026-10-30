import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getPooledUrl, missingDbUrlMessage } from "./db-url";

/**
 * แอปรันบน serverless → ใช้ "pooled connection" (Supabase pooler)
 */
function resolveConnectionString(): string {
  const raw = getPooledUrl();
  if (!raw) throw new Error(missingDbUrlMessage());

  // ตัด query params ที่ node-postgres ไม่ใช้ / ทำให้ SSL ของ Supabase ตรวจ cert ไม่ผ่าน
  const url = new URL(raw);
  for (const p of ["sslmode", "pgbouncer", "supa", "connect_timeout"]) {
    url.searchParams.delete(p);
  }
  return url.toString();
}

function createClient() {
  const connectionString = resolveConnectionString();
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
  const adapter = new PrismaPg({
    connectionString,
    // Supabase ใช้ SSL แต่ cert chain ไม่ผ่านการตรวจของ node-postgres; ฐานข้อมูลในเครื่องไม่มี SSL
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
