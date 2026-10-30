"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `ยาวได้ไม่เกิน ${max} ตัวอักษร`)
    .transform((v) => v || null)
    .nullable()
    .optional();

const CustomerSchema = z
  .object({
    fullName: optional(120),
    lineName: optional(120),
    phone: optional(30).refine((v) => !v || /^[\d\s+\-().]{6,}$/.test(v), "เบอร์โทรไม่ถูกต้อง"),
    email: optional(160).refine((v) => !v || z.email().safeParse(v).success, "อีเมลไม่ถูกต้อง"),
    company: optional(160),
    address: optional(500),
  })
  .refine((v) => v.fullName || v.lineName || v.phone, {
    message: "กรอกชื่อหรือเบอร์โทรอย่างน้อยหนึ่งช่อง",
    path: ["fullName"],
  });

export type CustomerFormState = ActionResult<{ id: string }> | undefined;

function readForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    fullName: get("fullName"),
    lineName: get("lineName"),
    phone: get("phone"),
    email: get("email"),
    company: get("company"),
    address: get("address"),
  };
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

async function phoneTaken(phone: string | null, exceptId?: string) {
  if (!phone) return null;
  return prisma.customer.findFirst({
    where: { phone, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true, fullName: true, lineName: true },
  });
}

export async function createCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await getCurrentUser();
  const parsed = CustomerSchema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrors(parsed.error) };

  const data = { ...parsed.data, phone: normalizePhone(parsed.data.phone) };
  const dup = await phoneTaken(data.phone);
  if (dup) {
    return {
      ok: false,
      error: "เบอร์นี้มีในระบบแล้ว",
      fieldErrors: { phone: `ซ้ำกับ ${dup.fullName || dup.lineName || "ลูกค้ารายอื่น"}` },
    };
  }

  const customer = await prisma.customer.create({ data, select: { id: true } });
  refresh();
  return { ok: true, message: "เพิ่มลูกค้าแล้ว", data: { id: customer.id } };
}

export async function updateCustomer(id: string, _prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await getCurrentUser();
  const parsed = CustomerSchema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrors(parsed.error) };

  const data = { ...parsed.data, phone: normalizePhone(parsed.data.phone) };
  const dup = await phoneTaken(data.phone, id);
  if (dup) {
    return { ok: false, error: "เบอร์นี้มีในระบบแล้ว", fieldErrors: { phone: `ซ้ำกับ ${dup.fullName || dup.lineName}` } };
  }

  await prisma.customer.update({ where: { id }, data });
  refresh();
  return { ok: true, message: "บันทึกแล้ว", data: { id } };
}

export async function setCustomerTags(customerId: string, tagIds: string[]): Promise<ActionResult> {
  await getCurrentUser();
  const unique = [...new Set(tagIds)].slice(0, 30);
  await prisma.$transaction([
    prisma.customerTag.deleteMany({ where: { customerId, tagId: { notIn: unique } } }),
    prisma.customerTag.createMany({
      data: unique.map((tagId) => ({ customerId, tagId })),
      skipDuplicates: true,
    }),
  ]);
  refresh();
  return { ok: true };
}

/** ลบแบบกู้คืนได้ — ประวัติแชทและแต้มยังอยู่ครบ */
export async function deleteCustomer(id: string, opts?: { redirectTo?: string }): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  if (opts?.redirectTo) redirect(opts.redirectTo);
  refresh();
  return { ok: true, message: "ย้ายไปถังขยะแล้ว" };
}

export async function restoreCustomer(id: string): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await prisma.customer.update({ where: { id }, data: { deletedAt: null } });
  refresh();
  return { ok: true, message: "กู้คืนลูกค้าแล้ว" };
}

export async function assignCustomer(customerId: string, adminId: string | null): Promise<ActionResult> {
  await getCurrentUser();
  await prisma.customer.update({ where: { id: customerId }, data: { assignedToId: adminId } });
  refresh();
  return { ok: true };
}
