import "server-only";
import type { AdminRole } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function listTeam() {
  return prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { ownedDeals: true, assignedCustomers: true } },
    },
  });
}

export type TeamMember = Awaited<ReturnType<typeof listTeam>>[number];

/**
 * กติกาสิทธิ์จัดการทีม
 * - เจ้าของ: จัดการได้ทุกคน (ยกเว้นปิดบัญชี/ลดสิทธิ์ตัวเอง)
 * - แอดมิน: เพิ่ม/แก้/รีเซ็ต/ปิด ได้เฉพาะเซลส์
 * - เซลส์: จัดการทีมไม่ได้
 */
export function rolesAssignableBy(actor: CurrentUser): AdminRole[] {
  if (actor.role === "OWNER") return ["OWNER", "ADMIN", "SALES"];
  if (actor.role === "ADMIN") return ["SALES"];
  return [];
}

export function canManageMember(actor: CurrentUser, target: { id: string; role: AdminRole }) {
  if (actor.role === "OWNER") return true;
  if (actor.role === "ADMIN") return target.role === "SALES" && target.id !== actor.id;
  return false;
}
