"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_LINE_PREFIX, DEMO_TAG_NAMES } from "@/lib/demo";
import type { ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** ลบลูกค้าตัวอย่าง (Udemo…) พร้อมแชท โน้ต ดีล — เฉพาะเจ้าของระบบ */
export async function purgeDemoData(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "OWNER") return { ok: false, error: "เฉพาะเจ้าของระบบเท่านั้น" };

  const result = await prisma.$transaction(async (tx) => {
    const customers = await tx.customer.deleteMany({ where: { lineUserId: { startsWith: DEMO_LINE_PREFIX } } });
    // แท็กตัวอย่างที่ไม่มีลูกค้าจริงใช้แล้ว
    const tags = await tx.tag.deleteMany({ where: { name: { in: DEMO_TAG_NAMES }, customers: { none: {} } } });
    return { customers: customers.count, tags: tags.count };
  });
  refresh();
  return { ok: true, message: `ลบลูกค้าตัวอย่าง ${result.customers} ราย และแท็กตัวอย่าง ${result.tags} แท็กแล้ว` };
}
