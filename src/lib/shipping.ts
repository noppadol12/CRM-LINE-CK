import "server-only";
import { PROVINCES } from "@/lib/provinces";
import { prisma } from "@/lib/prisma";

const th = (a: string, b: string) => a.localeCompare(b, "th");
const active = { deletedAt: null };

export async function listCarriers() {
  const rows = await prisma.carrier.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          coverage: true,
          primaryCustomers: { where: active },
          backupCustomers: { where: active },
          shipments: true,
        },
      },
    },
  });
  return rows;
}
export type CarrierRow = Awaited<ReturnType<typeof listCarriers>>[number];

/** ตัวเลือกขนส่งสำหรับฟอร์ม (พร้อมจังหวัดที่ไป เพื่อแนะนำเจ้าที่ไปจังหวัดของลูกค้าก่อน) */
export async function carrierOptions() {
  const rows = await prisma.carrier.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      kind: true,
      trackingUrl: true,
      coverage: { select: { province: true, branch: true, phone: true } },
    },
  });
  return rows;
}
export type CarrierOption = Awaited<ReturnType<typeof carrierOptions>>[number];

export async function getCarrier(id: string) {
  const carrier = await prisma.carrier.findUnique({
    where: { id },
    include: {
      coverage: true,
      primaryCustomers: { where: active, select: customerSelect },
      backupCustomers: { where: active, select: customerSelect },
      shipments: {
        orderBy: { shippedAt: "desc" },
        take: 20,
        include: { customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true } } },
      },
    },
  });
  if (!carrier) return null;
  carrier.coverage.sort((a, b) => th(a.province, b.province));
  return carrier;
}

const customerSelect = {
  id: true,
  fullName: true,
  lineName: true,
  lineUserId: true,
  company: true,
  phone: true,
  province: true,
  shippingNote: true,
  carrierId: true,
  backupCarrierId: true,
} as const;

/** ภาพรวมทุกจังหวัด: จำนวนขนส่ง / ลูกค้า */
export async function provinceOverview() {
  const [coverage, customers] = await Promise.all([
    prisma.carrierCoverage.groupBy({ by: ["province"], where: { carrier: { isActive: true } }, _count: true }),
    prisma.customer.groupBy({ by: ["province"], where: { ...active, province: { not: null } }, _count: true }),
  ]);
  const cov = new Map(coverage.map((r) => [r.province, r._count]));
  const cus = new Map(customers.map((r) => [r.province!, r._count]));
  return Object.fromEntries(PROVINCES.map((p) => [p, { carriers: cov.get(p) ?? 0, customers: cus.get(p) ?? 0 }]));
}

export async function getProvince(province: string) {
  const [coverage, customers] = await Promise.all([
    prisma.carrierCoverage.findMany({
      where: { province },
      include: { carrier: { select: { id: true, name: true, kind: true, phone: true, isActive: true, cutoffTime: true, payment: true } } },
    }),
    prisma.customer.findMany({
      where: { ...active, province },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }],
      select: {
        ...customerSelect,
        carrier: { select: { id: true, name: true } },
        backupCarrier: { select: { id: true, name: true } },
      },
    }),
  ]);
  coverage.sort((a, b) => Number(b.carrier.isActive) - Number(a.carrier.isActive) || th(a.carrier.name, b.carrier.name));
  return { coverage, customers };
}

export async function listShipments(opts: { carrierId?: string; q?: string; take?: number }) {
  const q = opts.q?.trim();
  return prisma.shipment.findMany({
    where: {
      ...(opts.carrierId ? { carrierId: opts.carrierId } : {}),
      ...(q
        ? {
            OR: [
              { trackingNo: { contains: q, mode: "insensitive" } },
              { customer: { fullName: { contains: q, mode: "insensitive" } } },
              { customer: { lineName: { contains: q, mode: "insensitive" } } },
              { customer: { company: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { shippedAt: "desc" },
    take: opts.take ?? 200,
    include: shipmentInclude,
  });
}

export const shipmentInclude = {
  customer: { select: { id: true, fullName: true, lineName: true, lineUserId: true, province: true } },
  carrier: { select: { id: true, name: true, trackingUrl: true } },
  deal: { select: { id: true, title: true } },
  createdBy: { select: { name: true } },
} as const;

export function customerShipments(customerId: string, take = 5) {
  return prisma.shipment.findMany({ where: { customerId }, orderBy: { shippedAt: "desc" }, take, include: shipmentInclude });
}
export type ShipmentRow = Awaited<ReturnType<typeof customerShipments>>[number];

/** แปลงเป็นข้อมูลธรรมดาส่งให้ client component */
export function toShipmentDTO(s: ShipmentRow) {
  return {
    id: s.id,
    trackingNo: s.trackingNo,
    cost: s.cost == null ? null : Number(s.cost),
    boxes: s.boxes,
    shippedAt: s.shippedAt,
    note: s.note,
    notifiedAt: s.notifiedAt,
    dealId: s.deal?.id ?? null,
    dealTitle: s.deal?.title ?? null,
    carrier: s.carrier,
    customer: s.customer,
    createdBy: s.createdBy?.name ?? null,
  };
}
export type ShipmentDTO = ReturnType<typeof toShipmentDTO>;
