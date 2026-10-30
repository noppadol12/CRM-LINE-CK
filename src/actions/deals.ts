"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { CLOSED_STAGES, DEAL_STAGES, type DealStageKey } from "@/lib/deal-stages";
import { displayName } from "@/lib/format";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const STAGE_KEYS = DEAL_STAGES.map((s) => s.key) as [DealStageKey, ...DealStageKey[]];

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

/** วันที่จาก <input type="date"> → เที่ยงวันเวลาไทย (กันวันเลื่อนเพราะ timezone) */
const dateInput = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? new Date(`${v}T12:00:00+07:00`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "วันที่ไม่ถูกต้อง");

const DealSchema = z
  .object({
    customerId: z.string().min(1, "เลือกลูกค้า"),
    title: z.string().trim().min(1, "ตั้งชื่อดีล เช่น สินค้าหรืองานที่ลูกค้าถาม").max(160),
    items: opt(2000),
    amount: z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v ? Number(v.replace(/[,\s฿]/g, "")) : null))
      .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n < 1e10), "มูลค่าไม่ถูกต้อง"),
    stage: z.enum(STAGE_KEYS).default("INQUIRY"),
    quoteNo: opt(60),
    nextFollowUpAt: dateInput,
    expectedCloseDate: dateInput,
    lostReason: opt(300),
    ownerId: opt(40),
  })
  .refine((v) => v.stage !== "LOST" || v.lostReason, { message: "ระบุเหตุผลที่ลูกค้าไม่ซื้อ", path: ["lostReason"] });

export type DealFormState = ActionResult<{ id: string }> | undefined;

function read(fd: FormData) {
  const g = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    customerId: g("customerId") ?? "",
    title: g("title") ?? "",
    items: g("items"),
    amount: g("amount"),
    stage: g("stage"),
    quoteNo: g("quoteNo"),
    nextFollowUpAt: g("nextFollowUpAt"),
    expectedCloseDate: g("expectedCloseDate"),
    lostReason: g("lostReason"),
    ownerId: g("ownerId"),
  };
}

function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

const closedAtFor = (stage: DealStageKey) => (CLOSED_STAGES.includes(stage) ? new Date() : null);

export async function createDeal(_prev: DealFormState, fd: FormData): Promise<DealFormState> {
  const user = await getCurrentUser();
  const parsed = DealSchema.safeParse(read(fd));
  if (!parsed.success) return { ok: false, error: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: d.customerId }, select: { id: true } });
  if (!customer) return { ok: false, error: "ไม่พบลูกค้า", fieldErrors: { customerId: "ไม่พบลูกค้า" } };

  const deal = await prisma.deal.create({
    data: {
      ...d,
      ownerId: d.ownerId ?? user.id,
      lostReason: d.stage === "LOST" ? d.lostReason : null,
      closedAt: closedAtFor(d.stage),
      events: { create: { type: "created", toStage: d.stage, actorId: user.id } },
    },
    select: { id: true },
  });
  refresh();
  return { ok: true, message: "สร้างดีลแล้ว", data: { id: deal.id } };
}

export async function updateDeal(id: string, _prev: DealFormState, fd: FormData): Promise<DealFormState> {
  const user = await getCurrentUser();
  const parsed = DealSchema.safeParse(read(fd));
  if (!parsed.success) return { ok: false, error: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const current = await prisma.deal.findUnique({ where: { id }, select: { stage: true } });
  if (!current) return { ok: false, error: "ไม่พบดีล" };
  const stageChanged = current.stage !== d.stage;

  await prisma.deal.update({
    where: { id },
    data: {
      ...d,
      lostReason: d.stage === "LOST" ? d.lostReason : null,
      ...(stageChanged ? { stageChangedAt: new Date(), closedAt: closedAtFor(d.stage) } : {}),
      events: {
        create: stageChanged
          ? { type: "stage", fromStage: current.stage, toStage: d.stage, actorId: user.id, note: d.lostReason }
          : { type: "updated", actorId: user.id },
      },
    },
  });
  refresh();
  return { ok: true, message: "บันทึกดีลแล้ว", data: { id } };
}

/** ย้ายขั้น (ลากการ์ด / เลือกจากเมนู) */
export async function moveDealStage(id: string, stage: DealStageKey, lostReason?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!STAGE_KEYS.includes(stage)) return { ok: false, error: "ขั้นไม่ถูกต้อง" };
  const current = await prisma.deal.findUnique({ where: { id }, select: { stage: true } });
  if (!current) return { ok: false, error: "ไม่พบดีล" };
  if (current.stage === stage) return { ok: true };
  if (stage === "LOST" && !lostReason?.trim()) return { ok: false, error: "ระบุเหตุผลที่ลูกค้าไม่ซื้อ" };

  await prisma.deal.update({
    where: { id },
    data: {
      stage,
      stageChangedAt: new Date(),
      closedAt: closedAtFor(stage),
      lostReason: stage === "LOST" ? lostReason!.trim().slice(0, 300) : null,
      events: { create: { type: "stage", fromStage: current.stage, toStage: stage, actorId: user.id, note: lostReason } },
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await prisma.deal.delete({ where: { id } });
  refresh();
  return { ok: true, message: "ลบดีลแล้ว" };
}

/** ค้นหาลูกค้าสำหรับช่องเลือกลูกค้าในฟอร์มดีล */
export async function searchCustomers(q: string) {
  await getCurrentUser();
  const term = q.trim().slice(0, 60);
  const digits = term.replace(/\D/g, "");
  const rows = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(term
        ? {
            OR: [
              { fullName: { contains: term, mode: "insensitive" } },
              { lineName: { contains: term, mode: "insensitive" } },
              { company: { contains: term, mode: "insensitive" } },
              ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 8,
    select: { id: true, fullName: true, lineName: true, lineUserId: true, company: true },
  });
  return rows.map((c) => ({ id: c.id, name: displayName(c), company: c.company }));
}
