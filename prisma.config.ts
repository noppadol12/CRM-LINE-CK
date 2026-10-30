import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getDirectUrl, missingDbUrlMessage } from "./src/lib/db-url";

const directUrl = getDirectUrl();

// db push / migrate ต้องมี URL — แจ้ง error ที่อ่านเข้าใจแทน error กลางๆ ของ Prisma
const needsDb = process.argv.some((a) => ["push", "migrate", "pull", "seed"].includes(a));
if (needsDb && !directUrl) {
  throw new Error(missingDbUrlMessage());
}

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
