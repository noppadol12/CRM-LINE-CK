import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { AdminRole } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

/**
 * Data Access Layer: อ่าน session → ตรวจผู้ใช้ในฐานข้อมูล → คืนข้อมูลแบบย่อ
 * ทุก component / action ที่แตะข้อมูลลูกค้าต้องเรียกฟังก์ชันนี้ก่อน
 * (proxy.ts เป็นแค่ด่านแรกแบบเร็ว ไม่ใช่ตัวตรวจสิทธิ์จริง)
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  // ข้อมูลของผู้ใช้แต่ละคนต้องคำนวณตอน request เท่านั้น (iron-session ใช้ Date.now() ตอนถอดรหัส)
  await connection();
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/login");

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export const ROLE_LABEL: Record<AdminRole, string> = {
  OWNER: "เจ้าของ",
  ADMIN: "แอดมิน",
  SALES: "เซลส์",
};
