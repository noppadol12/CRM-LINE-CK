/**
 * ข้อมูลตัวอย่างสำหรับทดสอบหน้าจอ
 * รันเฉพาะเมื่อ SEED_DEMO=true และรันซ้ำได้ (ไม่สร้างข้อมูลซ้ำ)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const TAGS = [
  { name: "VIP", color: "amber" },
  { name: "ช่างแอร์", color: "sky" },
  { name: "ผู้รับเหมา", color: "violet" },
  { name: "ลูกค้าโครงการ", color: "emerald" },
  { name: "สนใจวาล์ว", color: "rose" },
];

const CUSTOMERS = [
  { lineUserId: "Udemo0000000000000000000000000001", lineName: "Somchai Air", fullName: "สมชาย ใจดี", phone: "081-234-5678", company: "สมชายแอร์เซอร์วิส", tags: ["ช่างแอร์", "VIP"] },
  { lineUserId: "Udemo0000000000000000000000000002", lineName: "Nok", fullName: "วรรณา ศรีสุข", phone: "089-111-2233", company: null, tags: ["สนใจวาล์ว"] },
  { lineUserId: "Udemo0000000000000000000000000003", lineName: "BKK Chiller Co.", fullName: "ประเสริฐ วงศ์ทอง", phone: "02-555-0199", company: "บางกอกชิลเลอร์ จำกัด", tags: ["ลูกค้าโครงการ", "VIP"] },
  { lineUserId: "Udemo0000000000000000000000000004", lineName: "Tum Engineer", fullName: "ธนากร มีสุข", phone: "086-777-8899", company: "TK Engineering", tags: ["ผู้รับเหมา"] },
  { lineUserId: "Udemo0000000000000000000000000005", lineName: "Ploy", fullName: null, phone: null, company: null, tags: [] },
  { lineUserId: "Udemo0000000000000000000000000006", lineName: "Anan Cooling", fullName: "อนันต์ เย็นใจ", phone: "084-321-6547", company: "อนันต์คูลลิ่ง", tags: ["ช่างแอร์"] },
];

const CONVERSATIONS: Record<number, { dir: "INBOUND" | "OUTBOUND"; text: string }[]> = {
  0: [
    { dir: "INBOUND", text: "สวัสดีครับ มี Expansion valve รุ่น TEX2 ไหมครับ" },
    { dir: "OUTBOUND", text: "สวัสดีครับคุณสมชาย มีพร้อมส่งครับ ต้องการกี่ตัวครับ" },
    { dir: "INBOUND", text: "เอา 3 ตัวครับ ส่งพรุ่งนี้ได้ไหม" },
  ],
  1: [
    { dir: "INBOUND", text: "สอบถามราคา Solenoid valve 1/2 นิ้วค่ะ" },
  ],
  2: [
    { dir: "INBOUND", text: "ขอใบเสนอราคา Chiller parts ตามไฟล์แนบครับ" },
    { dir: "OUTBOUND", text: "ได้รับแล้วครับ จะส่งใบเสนอราคาให้ภายในวันนี้ครับ" },
  ],
  3: [
    { dir: "INBOUND", text: "คอมเพรสเซอร์ 5 ตันมีของไหมครับ ใช้งานโรงงาน" },
    { dir: "OUTBOUND", text: "มีครับคุณธนากร เดี๋ยวส่งใบเสนอราคาให้นะครับ" },
  ],
  5: [{ dir: "INBOUND", text: "ร้านเปิดวันเสาร์ไหมครับ" }],
};

/**
 * สร้างบัญชีเจ้าของ (OWNER) คนแรกจาก ADMIN_EMAIL + ADMIN_PASSWORD
 * - ถ้ามีอีเมลนี้อยู่แล้วจะไม่แตะรหัสผ่าน (ลบ ADMIN_PASSWORD ออกหลังล็อกอินได้เลย)
 * - ลืมรหัสผ่าน: ตั้ง ADMIN_RESET_PASSWORD=true + ADMIN_PASSWORD ใหม่ แล้ว redeploy
 */
async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("seed: ข้ามการสร้างแอดมิน (ไม่ได้ตั้ง ADMIN_EMAIL / ADMIN_PASSWORD)");
    return;
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD ต้องยาวอย่างน้อย 8 ตัวอักษร");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 10);

  if (!existing) {
    await prisma.adminUser.create({
      data: { email, name: process.env.ADMIN_NAME?.trim() || "เจ้าของระบบ", role: "OWNER", passwordHash },
    });
    console.log(`seed: สร้างบัญชีเจ้าของ ${email} แล้ว`);
  } else if (process.env.ADMIN_RESET_PASSWORD === "true") {
    await prisma.adminUser.update({ where: { email }, data: { passwordHash, isActive: true } });
    console.log(`seed: รีเซ็ตรหัสผ่าน ${email} แล้ว — อย่าลืมลบ ADMIN_RESET_PASSWORD`);
  } else {
    console.log(`seed: มีบัญชี ${email} อยู่แล้ว`);
  }
}

/** ปรับข้อมูลเดิมให้ตรงรูปแบบปัจจุบัน — รันทุก deploy ได้ ไม่มีผลถ้าไม่มีอะไรต้องแก้ */
async function normalizeData() {
  const fixed = await prisma.$executeRaw`
    UPDATE customers SET phone = NULLIF(regexp_replace(phone, '\\D', '', 'g'), '')
    WHERE phone ~ '\\D'`;
  if (fixed > 0) console.log(`seed: ปรับรูปแบบเบอร์โทร ${fixed} รายการ`);
}

/** ข้อความสำเร็จรูปเริ่มต้น — สร้างเฉพาะตอนยังไม่มีเลย (แก้/ลบได้ในหน้าตั้งค่า) */
const STARTER_REPLIES = [
  { title: "ทักทาย", body: "สวัสดีครับคุณ{ชื่อลูกค้า} ขอบคุณที่ติดต่อ CK Aircondition ครับ สนใจสินค้าตัวไหน แจ้งรุ่นหรือส่งรูปป้ายสินค้ามาได้เลยครับ" },
  { title: "ขอรุ่น/รูปป้าย", body: "รบกวนส่งรูปป้ายชื่อ (Nameplate) ของเครื่องหรืออะไหล่เดิม และแจ้งจำนวนที่ต้องการด้วยครับ จะได้เช็คสต็อกและราคาให้ถูกรุ่นครับ" },
  { title: "เลขบัญชีโอนเงิน", body: "ยอดชำระ ___ บาท\nโอนเข้าบัญชี [ธนาคาร] เลขที่ [xxx-x-xxxxx-x] ชื่อบัญชี [ชื่อบัญชี]\nโอนแล้วส่งสลิปในแชทนี้ได้เลยครับ" },
  { title: "ค่าจัดส่ง", body: "จัดส่งทั่วประเทศครับ ค่าส่งคิดตามน้ำหนักและขนาดสินค้า สั่งก่อน 14:00 น. ส่งภายในวันเดียวกันครับ" },
  { title: "แจ้งเลขพัสดุ", body: "จัดส่งเรียบร้อยแล้วครับคุณ{ชื่อลูกค้า} เลขพัสดุ: ___ ขอบคุณที่ใช้บริการครับ 🙏" },
];

async function seedQuickReplies() {
  if ((await prisma.quickReply.count()) > 0) return;
  await prisma.quickReply.createMany({ data: STARTER_REPLIES.map((r, i) => ({ ...r, sortOrder: i })) });
  console.log(`seed: สร้างข้อความสำเร็จรูปเริ่มต้น ${STARTER_REPLIES.length} รายการ`);
}

/** ดีลตัวอย่างสำหรับลูกค้าตัวอย่าง (Udemo…) — สร้างครั้งเดียว */
async function seedDemoDeals() {
  const demo = await prisma.customer.findMany({
    where: { lineUserId: { startsWith: "Udemo" } },
    orderBy: { lineUserId: "asc" },
    select: { id: true },
  });
  if (demo.length < 4) return;
  if ((await prisma.deal.count({ where: { customerId: { in: demo.map((d) => d.id) } } })) > 0) return;

  const owner = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const day = 86_400_000;
  const now = Date.now();
  const deals = [
    { c: 0, title: "Expansion valve TEX2 x3", items: "Danfoss TEX2 3 ตัว", amount: 5550, stage: "AWAITING_PAYMENT", follow: 0 },
    { c: 1, title: "Solenoid valve 1/2 นิ้ว", items: "Solenoid valve 1/2\" + คอยล์ 220V", amount: 1890, stage: "QUOTED", follow: 1, quoteNo: "QT2026-0142" },
    { c: 2, title: "อะไหล่ Chiller โครงการโรงพยาบาล", items: "ตามไฟล์ BOQ ที่ลูกค้าส่ง", amount: 186000, stage: "INQUIRY", follow: -1 },
    { c: 3, title: "คอมเพรสเซอร์ 5 ตัน", items: "Scroll compressor 5TR 380V", amount: 42500, stage: "QUOTED", follow: 2, quoteNo: "QT2026-0145" },
    { c: 0, title: "ฟิลเตอร์ดรายเออร์ 10 ตัว", items: "Filter drier 3/8", amount: 2400, stage: "WON", follow: null },
  ] as const;

  for (const d of deals) {
    const closed = d.stage === "WON";
    await prisma.deal.create({
      data: {
        customerId: demo[d.c].id,
        title: d.title,
        items: d.items,
        amount: d.amount,
        stage: d.stage,
        quoteNo: "quoteNo" in d ? d.quoteNo : null,
        ownerId: owner?.id ?? null,
        nextFollowUpAt: d.follow === null ? null : new Date(now + d.follow * day),
        closedAt: closed ? new Date(now - 2 * day) : null,
        stageChangedAt: new Date(now - (closed ? 2 : 1) * day),
        events: { create: { type: "created", toStage: d.stage, actorId: owner?.id ?? null } },
      },
    });
  }
  console.log(`seed: สร้างดีลตัวอย่าง ${deals.length} รายการ`);
}

async function main() {
  await bootstrapAdmin();
  await normalizeData();
  await seedQuickReplies();

  if (process.env.SEED_DEMO !== "true") {
    console.log("seed: ข้าม (ตั้ง SEED_DEMO=true เพื่อใส่ข้อมูลตัวอย่าง)");
    return;
  }

  const tagIds = new Map<string, string>();
  for (const t of TAGS) {
    const tag = await prisma.tag.upsert({ where: { name: t.name }, update: {}, create: t });
    tagIds.set(t.name, tag.id);
  }

  for (const [i, c] of CUSTOMERS.entries()) {
    const existing = await prisma.customer.findUnique({ where: { lineUserId: c.lineUserId } });
    if (existing) continue;

    const convo = CONVERSATIONS[i] ?? [];
    const now = Date.now();
    const base = now - (i + 1) * 3_600_000;

    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          lineUserId: c.lineUserId,
          lineName: c.lineName,
          fullName: c.fullName,
          phone: c.phone,
          company: c.company,
          followStatus: "FOLLOWING",
          followedAt: new Date(now - (i + 2) * 86_400_000 * 7),
          tags: { create: c.tags.map((name) => ({ tagId: tagIds.get(name)! })) },
        },
      });

      for (const [j, m] of convo.entries()) {
        await tx.chatMessage.create({
          data: {
            customerId: customer.id,
            direction: m.dir,
            type: "TEXT",
            text: m.text,
            sentAt: new Date(base + j * 120_000),
          },
        });
      }

      const last = convo.at(-1);
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          lastMessageAt: last ? new Date(base + (convo.length - 1) * 120_000) : null,
          lastMessagePreview: last?.text ?? null,
          unreadCount: last?.dir === "INBOUND" ? 1 : 0,
        },
      });

      if (i === 0) {
        await tx.adminNote.create({
          data: { customerId: customer.id, body: "ลูกค้าประจำ ชอบให้ส่งของรอบเช้า", isPinned: true },
        });
      }
    });
  }

  await seedDemoDeals();

  const count = await prisma.customer.count();
  console.log(`seed: เสร็จแล้ว — ลูกค้าในระบบ ${count} ราย`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
