"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** ปักดาว / เอาดาวออก (รายการโปรดของผู้ใช้คนนี้) */
export async function setFavorite(customerId: string, favorite: boolean): Promise<{ ok: true; favorite: boolean } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  const id = String(customerId);
  try {
    if (favorite) {
      await prisma.favoriteCustomer.upsert({
        where: { userId_customerId: { userId: user.id, customerId: id } },
        create: { userId: user.id, customerId: id },
        update: {},
      });
    } else {
      await prisma.favoriteCustomer.deleteMany({ where: { userId: user.id, customerId: id } });
    }
  } catch {
    return { ok: false, error: "บันทึกรายการโปรดไม่สำเร็จ" };
  }
  refresh();
  return { ok: true, favorite };
}
