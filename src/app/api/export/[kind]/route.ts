import { getApiUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { listStages } from "@/lib/stages";
import { CARRIER_KINDS, PAYMENT_LABEL } from "@/lib/provinces";

export const maxDuration = 60;

const KINDS = ["customers", "messages", "deals", "shipments", "carriers"] as const;
type Kind = (typeof KINDS)[number];
const BATCH = 1000;

const bkk = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const dt = (d: Date | null | undefined) => (d ? bkk.format(d) : "");

/** CSV ที่ Excel เปิดภาษาไทยได้ถูกต้อง (UTF-8 + BOM) และกันสูตรอันตราย (=, +, -, @) */
function cell(v: unknown): string {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (values: unknown[]) => values.map(cell).join(",") + "\r\n";

const FOLLOW: Record<string, string> = { FOLLOWING: "เป็นเพื่อน", UNFOLLOWED: "บล็อก", UNKNOWN: "ไม่ได้ผูก LINE" };

/** ดึงข้อมูลทีละชุดด้วย cursor (ไม่โหลดทั้งตารางเข้าหน่วยความจำ) */
async function* batches<T extends { id: string }>(fetch: (cursor: string | undefined) => Promise<T[]>) {
  let cursor: string | undefined;
  for (;;) {
    const rows = await fetch(cursor);
    if (rows.length === 0) return;
    yield rows;
    if (rows.length < BATCH) return;
    cursor = rows.at(-1)!.id;
  }
}
const page = (cursor: string | undefined) => ({ take: BATCH, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" as const } });

async function* customersCsv() {
  yield row(["รหัส", "ชื่อ", "ชื่อ LINE", "LINE User ID", "ประเภทแชท", "เบอร์โทร", "อีเมล", "บริษัท", "ที่อยู่", "จังหวัด", "ขนส่งหลัก", "ขนส่งสำรอง", "หมายเหตุจัดส่ง", "แท็ก", "สถานะ LINE", "ผู้ดูแล", "ข้อความล่าสุด", "สร้างเมื่อ", "ลบแล้ว"]);
  for await (const rows of batches((c) =>
    prisma.customer.findMany({
      ...page(c),
      include: {
        tags: { include: { tag: { select: { name: true } } } },
        assignedTo: { select: { name: true } },
        carrier: { select: { name: true } },
        backupCarrier: { select: { name: true } },
      },
    }),
  )) {
    yield rows
      .map((r) =>
        row([
          r.id,
          r.fullName,
          r.lineName,
          r.lineUserId,
          r.chatType === "user" ? "1:1" : r.chatType === "group" ? "กลุ่ม" : "หลายคน",
          formatPhone(r.phone),
          r.email,
          r.company,
          r.address,
          r.province,
          r.carrier?.name,
          r.backupCarrier?.name,
          r.shippingNote,
          r.tags.map((t) => t.tag.name).join(", "),
          FOLLOW[r.followStatus],
          r.assignedTo?.name,
          dt(r.lastMessageAt),
          dt(r.createdAt),
          r.deletedAt ? "ใช่" : "",
        ]),
      )
      .join("");
  }
}

async function* messagesCsv() {
  yield row(["เวลา", "รหัสลูกค้า", "ลูกค้า", "ทิศทาง", "ชนิด", "ข้อความ", "ผู้ส่ง (ทีม)", "ส่งแบบ", "ไฟล์ใน Google Drive"]);
  for await (const rows of batches((c) =>
    prisma.chatMessage.findMany({
      ...page(c),
      include: { customer: { select: { fullName: true, lineName: true } }, sentBy: { select: { name: true } } },
    }),
  )) {
    yield rows
      .map((m) =>
        row([
          dt(m.sentAt),
          m.customerId,
          m.customer.fullName || m.customer.lineName,
          m.direction === "INBOUND" ? "ลูกค้า → ร้าน" : "ร้าน → ลูกค้า",
          m.type,
          m.text,
          m.sentBy?.name,
          m.sentVia === "reply" ? "ตอบฟรี" : m.sentVia === "push" ? "Push" : "",
          m.driveFileId ? `https://drive.google.com/file/d/${m.driveFileId}/view` : "",
        ]),
      )
      .join("");
  }
}

async function* dealsCsv() {
  const STAGE = Object.fromEntries((await listStages()).map((s) => [s.id, s.name]));
  yield row(["รหัส", "ชื่อดีล", "ลูกค้า", "สินค้า", "มูลค่า (บาท)", "ขั้น", "เลขใบเสนอราคา", "ผู้ดูแล", "นัดติดตาม", "เหตุผลที่ไม่ซื้อ", "สร้างเมื่อ", "ปิดเมื่อ"]);
  for await (const rows of batches((c) =>
    prisma.deal.findMany({
      ...page(c),
      include: { customer: { select: { fullName: true, lineName: true } }, owner: { select: { name: true } } },
    }),
  )) {
    yield rows
      .map((d) =>
        row([
          d.id,
          d.title,
          d.customer.fullName || d.customer.lineName,
          d.items,
          d.amount?.toString(),
          STAGE[d.stage] ?? d.stage,
          d.quoteNo,
          d.owner?.name,
          dt(d.nextFollowUpAt),
          d.lostReason,
          dt(d.createdAt),
          dt(d.closedAt),
        ]),
      )
      .join("");
  }
}

async function* shipmentsCsv() {
  yield row(["วันที่ส่ง", "ลูกค้า", "จังหวัด", "ขนส่ง", "เลขพัสดุ", "ค่าส่ง (บาท)", "จำนวนกล่อง", "ดีล", "แจ้งลูกค้าแล้ว", "หมายเหตุ", "บันทึกโดย"]);
  for await (const rows of batches((c) =>
    prisma.shipment.findMany({
      ...page(c),
      include: {
        customer: { select: { fullName: true, lineName: true, province: true } },
        carrier: { select: { name: true } },
        deal: { select: { title: true } },
        createdBy: { select: { name: true } },
      },
    }),
  )) {
    yield rows
      .map((x) =>
        row([
          dt(x.shippedAt),
          x.customer.fullName || x.customer.lineName,
          x.customer.province,
          x.carrier?.name,
          x.trackingNo,
          x.cost?.toString(),
          x.boxes,
          x.deal?.title,
          x.notifiedAt ? dt(x.notifiedAt) : "",
          x.note,
          x.createdBy?.name,
        ]),
      )
      .join("");
  }
}

/** ขนส่ง 1 แถวต่อ 1 จังหวัดที่ไป (ขนส่งที่ยังไม่ระบุจังหวัดได้ 1 แถว) */
async function* carriersCsv() {
  yield row(["ขนส่ง", "ประเภท", "ใช้งานอยู่", "เบอร์โทร", "LINE", "จุดส่งของ", "ปิดรับ", "เก็บเงิน", "จังหวัด", "สาขาปลายทาง", "เบอร์สาขา", "ระยะเวลา", "หมายเหตุจังหวัด"]);
  for await (const rows of batches((c) => prisma.carrier.findMany({ ...page(c), include: { coverage: true } }))) {
    yield rows
      .flatMap((x) => {
        const base = [x.name, CARRIER_KINDS[x.kind] ?? x.kind, x.isActive ? "ใช่" : "ไม่", x.phone, x.lineId, x.dropoffAddress, x.cutoffTime, x.payment ? PAYMENT_LABEL[x.payment] : ""];
        const cov = [...x.coverage].sort((a, b) => a.province.localeCompare(b.province, "th"));
        return cov.length ? cov.map((v) => row([...base, v.province, v.branch, v.phone, v.transitDays, v.note])) : [row(base)];
      })
      .join("");
  }
}

const GENERATORS: Record<Kind, () => AsyncGenerator<string>> = {
  customers: customersCsv,
  messages: messagesCsv,
  deals: dealsCsv,
  shipments: shipmentsCsv,
  carriers: carriersCsv,
};

/** GET /api/export/:kind — ดาวน์โหลด CSV สำรองข้อมูล (เจ้าของ/แอดมินเท่านั้น) */
export async function GET(_req: Request, ctx: RouteContext<"/api/export/[kind]">) {
  const user = await getApiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!canManage(user)) return new Response("Forbidden", { status: 403 });
  const { kind } = await ctx.params;
  if (!KINDS.includes(kind as Kind)) return new Response("Not found", { status: 404 });

  const gen = GENERATORS[kind as Kind]();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("﻿"));
    },
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) controller.close();
        else controller.enqueue(encoder.encode(value));
      } catch (e) {
        console.error("[export] failed", e);
        controller.error(e);
      }
    },
  });

  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ck-crm-${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
