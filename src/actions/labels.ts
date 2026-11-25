"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { labelCarrierOf } from "@/lib/labels";
import { setSetting } from "@/lib/settings";

const SenderSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อผู้ส่ง").max(120),
  phone: z.string().trim().max(60),
  address: z.string().trim().min(1, "กรอกที่อยู่ผู้ส่ง").max(400),
});

export async function saveSender(input: { name: string; phone: string; address: string }): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const parsed = SenderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  await setSetting("sender", parsed.data);
  refresh();
  return { ok: true, message: "บันทึกข้อมูลผู้ส่งแล้ว" };
}

/** ค่าเริ่มต้นของหน้าต่างพิมพ์ใบปะหน้า */
export async function getLabelDefaults(customerId: string, shipmentId?: string | null) {
  await getCurrentUser();
  const [customer, shipment] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        lineName: true,
        company: true,
        phone: true,
        address: true,
        shippingNote: true,
        carrier: { select: { id: true, name: true } },
      },
    }),
    shipmentId
      ? prisma.shipment.findFirst({
          where: { id: shipmentId, customerId },
          select: { boxes: true, shippedAt: true, carrier: { select: { id: true, name: true } }, deal: { select: { quoteNo: true } } },
        })
      : null,
  ]);
  if (!customer) return null;
  return {
    name: customer.fullName || customer.lineName || "",
    company: customer.company ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    note: customer.shippingNote ?? "",
    ref: shipment?.deal?.quoteNo ?? "",
    carrier: labelCarrierOf(shipment?.carrier ?? customer.carrier),
    boxes: shipment?.boxes ?? 1,
    shippedAt: shipment?.shippedAt ?? null,
  };
}

const RecipientSchema = z.object({
  fullName: z.string().trim().max(120),
  company: z.string().trim().max(120),
  phone: z.string().trim().max(60),
  address: z.string().trim().max(500),
});

/** จำชื่อ/บริษัท/เบอร์/ที่อยู่ ที่แก้ในหน้าต่างพิมพ์ ไว้ในข้อมูลลูกค้า */
export async function saveRecipient(customerId: string, input: z.input<typeof RecipientSchema>): Promise<ActionResult> {
  await getCurrentUser();
  const parsed = RecipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const d = parsed.data;
  const r = await prisma.customer.updateMany({
    where: { id: customerId, deletedAt: null },
    data: { fullName: d.fullName || undefined, company: d.company || null, phone: d.phone || null, address: d.address || null },
  });
  if (!r.count) return { ok: false, error: "ไม่พบลูกค้า" };
  refresh();
  return { ok: true, message: "บันทึกที่อยู่ลูกค้าแล้ว" };
}
