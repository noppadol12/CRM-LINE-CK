import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI (db push / migrate) ต้องใช้ "direct connection" ที่ไม่ผ่าน pooler
 * รองรับทั้งชื่อตัวแปรจาก Vercel × Supabase integration และแบบตั้งเอง
 */
const directUrl =
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
  },
});
