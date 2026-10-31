"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { sendTextAsUser } from "@/lib/chat-send";
import { canManage, NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CARRIER_KINDS, isProvince, PAYMENT_LABEL, PROVINCES } from "@/lib/provinces";
import { carrierOptions } from "@/lib/shipping";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `ยาวได้ไม่เกิน ${max} ตัวอักษร`)
    .nullish()
    .transform((v) => v || null);

const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";

// ---------- บริษัทขนส่ง ----------

const CarrierSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อขนส่ง").max(100),
  kind: z.enum(Object.keys(CARRIER_KINDS) as [string, ...string[]]),
  phone: opt(100),
  lineId: opt(100),
  dropoffAddress: opt(500),
  mapUrl: opt(500).refine((v) => !v || /^https?:\/\//.test(v), "ลิงก์แผนที่ต้องขึ้นต้นด้วย https://"),
  cutoffTime: opt(40),
  payment: z
    .enum(Object.keys(PAYMENT_LABEL) as [string, ...string[]])
    .nullish()
    .or(z.literal("").transform(() => null)),
  priceNote: opt(1000),
  trackingUrl: opt(500).refine((v) => !v || /^https?:\/\//.test(v), "ลิงก์ติดตามพัสดุต้องขึ้นต้นด้วย https://"),
  note: opt(2000),
  isActive: z.boolean().default(true),
});
export type CarrierInput = z.input<typeof CarrierSchema>;

export async function saveCarrier(id: string | null, input: CarrierInput): Promise<ActionResult<{ id: string }>> {
  await getCurrentUser();
  const parsed = CarrierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = { ...parsed.data, payment: parsed.data.payment ?? null };
  const row = id
    ? await prisma.carrier.update({ where: { id }, data, select: { id: true } })
    : await prisma.carrier.create({ data, select: { id: true } });
  refresh();
  return { ok: true, message: id ? "บันทึกแล้ว" : `เพิ่ม ${data.name} แล้ว`, data: { id: row.id } };
}

export async function deleteCarrier(id: string): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await prisma.carrier.delete({ where: { id } });
  refresh();
  return { ok: true, message: "ลบขนส่งแล้ว (ประวัติการส่งยังอยู่ แต่ไม่ระบุขนส่ง)" };
}

// ---------- พื้นที่ให้บริการ ----------

export async function addCoverage(carrierId: string, provinces: string[]): Promise<ActionResult> {
  await getCurrentUser();
  const list = [...new Set(provinces)].filter((p) => PROVINCES.includes(p));
  if (list.length === 0) return { ok: false, error: "เลือกจังหวัดอย่างน้อย 1 จังหวัด" };
  const r = await prisma.carrierCoverage.createMany({ data: list.map((province) => ({ carrierId, province })), skipDuplicates: true });
  refresh();
  return { ok: true, message: `เพิ่ม ${r.count} จังหวัดแล้ว` };
}

const CoverageSchema = z.object({ branch: opt(300), phone: opt(100), transitDays: opt(40), note: opt(500) });
export type CoverageInput = z.input<typeof CoverageSchema>;

/** เพิ่ม/แก้ข้อมูลสาขาปลายทางของขนส่งในจังหวัดหนึ่ง */
export async function saveCoverage(carrierId: string, province: string, input: CoverageInput): Promise<ActionResult> {
  await getCurrentUser();
  if (!isProvince(province)) return { ok: false, error: "จังหวัดไม่ถูกต้อง" };
  const parsed = CoverageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  await prisma.carrierCoverage.upsert({
    where: { carrierId_province: { carrierId, province } },
    create: { carrierId, province, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { ok: true, message: "บันทึกแล้ว" };
}

export async function removeCoverage(carrierId: string, province: string): Promise<ActionResult> {
  await getCurrentUser();
  await prisma.carrierCoverage.deleteMany({ where: { carrierId, province } });
  refresh();
  return { ok: true, message: `นำ ${province} ออกแล้ว` };
}

// ---------- ข้อมูลจัดส่งของลูกค้า ----------

const CustomerShippingSchema = z.object({
  province: z
    .string()
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || PROVINCES.includes(v), "จังหวัดไม่ถูกต้อง"),
  carrierId: opt(40),
  backupCarrierId: opt(40),
  shippingNote: opt(500),
});
export type CustomerShippingInput = z.input<typeof CustomerShippingSchema>;

export async function updateCustomerShipping(customerId: string, input: CustomerShippingInput): Promise<ActionResult> {
  await getCurrentUser();
  const parsed = CustomerShippingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  if (d.carrierId && d.carrierId === d.backupCarrierId) d.backupCarrierId = null;
  await prisma.customer.update({ where: { id: customerId }, data: d });
  refresh();
  return { ok: true, message: "บันทึกข้อมูลจัดส่งแล้ว" };
}

// ---------- บันทึกการส่งของ ----------

/** ข้อมูลสำหรับเปิดฟอร์มบันทึกการส่ง (โหลดตอนเปิด dialog — ใช้ได้จากทุกหน้า) */
export async function getShipmentFormData(customerId: string) {
  await getCurrentUser();
  const [customer, carriers, deals] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, fullName: true, lineName: true, lineUserId: true, followStatus: true, province: true, carrierId: true, backupCarrierId: true, shippingNote: true },
    }),
    carrierOptions(),
    prisma.deal.findMany({
      where: { customerId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, stage: true },
    }),
  ]);
  return { customer, carriers, deals };
}

const ShipmentSchema = z.object({
  customerId: z.string().min(1),
  dealId: opt(40),
  carrierId: opt(40),
  trackingNo: opt(100),
  cost: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => (v === "" || v == null ? null : Number(String(v).replace(/[,\s฿]/g, ""))))
    .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n < 1e8), "ค่าส่งไม่ถูกต้อง"),
  boxes: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => (v === "" || v == null ? null : Math.round(Number(v))))
    .refine((n) => n === null || (Number.isFinite(n) && n > 0 && n < 10000), "จำนวนกล่องไม่ถูกต้อง"),
  shippedAt: z
    .string()
    .nullish()
    .transform((v) => (v ? new Date(`${v}T12:00:00+07:00`) : new Date()))
    .refine((d) => !Number.isNaN(d.getTime()), "วันที่ไม่ถูกต้อง"),
  note: opt(1000),
  notify: z.boolean().default(false),
  message: opt(5000),
  followUpDays: z.number().int().min(1).max(60).nullish(),
});
export type ShipmentInput = z.input<typeof ShipmentSchema>;

export async function saveShipment(id: string | null, input: ShipmentInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = ShipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { notify, message, followUpDays, ...data } = parsed.data;
  if (notify && !message) return { ok: false, error: "พิมพ์ข้อความที่จะส่งให้ลูกค้า" };

  const saved = id
    ? await prisma.shipment.update({ where: { id }, data, select: { id: true } })
    : await prisma.shipment.create({ data: { ...data, createdById: user.id }, select: { id: true } });

  // งานติดตาม: ถามลูกค้าว่าได้รับของหรือยัง (10:00 น. เวลาไทย หลังวันส่ง n วัน)
  if (!id && followUpDays) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(data.shippedAt);
    const dueAt = new Date(new Date(`${day}T10:00:00+07:00`).getTime() + followUpDays * 86_400_000);
    const carrier = data.carrierId ? await prisma.carrier.findUnique({ where: { id: data.carrierId }, select: { name: true } }) : null;
    await prisma.task.create({
      data: {
        title: "ถามลูกค้าว่าได้รับของแล้วหรือยัง",
        note: [carrier?.name, data.trackingNo && `เลขพัสดุ ${data.trackingNo}`].filter(Boolean).join(" · ") || null,
        dueAt,
        customerId: data.customerId,
        dealId: data.dealId,
        assigneeId: user.id,
        createdById: user.id,
      },
    });
  }

  // จำขนส่งที่ใช้ไว้เป็นขนส่งหลักของลูกค้า ถ้ายังไม่เคยตั้ง
  if (data.carrierId) {
    await prisma.customer.updateMany({ where: { id: data.customerId, carrierId: null }, data: { carrierId: data.carrierId } });
  }

  let note = id ? "บันทึกแล้ว" : "บันทึกการส่งของแล้ว";
  if (notify && message) {
    const r = await sendTextAsUser(data.customerId, user.id, message);
    if (!r.ok) {
      refresh();
      return { ok: false, error: `บันทึกการส่งแล้ว แต่ส่งข้อความหาลูกค้าไม่สำเร็จ: ${r.error}` };
    }
    await prisma.shipment.update({ where: { id: saved.id }, data: { notifiedAt: new Date() } });
    note += r.via === "reply" ? " · ส่งเลขพัสดุให้ลูกค้าแล้ว (ฟรี)" : " · ส่งเลขพัสดุให้ลูกค้าแล้ว";
  }
  refresh();
  return { ok: true, message: note };
}

export async function deleteShipment(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const s = await prisma.shipment.findUnique({ where: { id }, select: { createdById: true } });
  if (!s) return { ok: false, error: "ไม่พบรายการ" };
  if (s.createdById !== user.id && !canManage(user)) return NO_PERMISSION;
  await prisma.shipment.delete({ where: { id } });
  refresh();
  return { ok: true, message: "ลบรายการแล้ว" };
}
