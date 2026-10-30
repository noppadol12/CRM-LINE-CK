import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/health — เช็คว่าเชื่อมฐานข้อมูลได้และตารางถูกสร้างแล้ว */
export async function GET() {
  await connection(); // รันทุกครั้งที่เรียก ไม่ cache ตอน build
  try {
    const [customers, messages, tags] = await Promise.all([
      prisma.customer.count(),
      prisma.chatMessage.count(),
      prisma.tag.count(),
    ]);
    return Response.json({ ok: true, database: "connected", counts: { customers, messages, tags } });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json(
      { ok: false, database: "error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
