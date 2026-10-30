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
  { lineUserId: "Udemo0000000000000000000000000001", lineName: "Somchai Air", fullName: "สมชาย ใจดี", phone: "081-234-5678", company: "สมชายแอร์เซอร์วิส", tags: ["ช่างแอร์", "VIP"], points: 1250 },
  { lineUserId: "Udemo0000000000000000000000000002", lineName: "Nok", fullName: "วรรณา ศรีสุข", phone: "089-111-2233", company: null, tags: ["สนใจวาล์ว"], points: 120 },
  { lineUserId: "Udemo0000000000000000000000000003", lineName: "BKK Chiller Co.", fullName: "ประเสริฐ วงศ์ทอง", phone: "02-555-0199", company: "บางกอกชิลเลอร์ จำกัด", tags: ["ลูกค้าโครงการ", "VIP"], points: 4800 },
  { lineUserId: "Udemo0000000000000000000000000004", lineName: "Tum Engineer", fullName: "ธนากร มีสุข", phone: "086-777-8899", company: "TK Engineering", tags: ["ผู้รับเหมา"], points: 640 },
  { lineUserId: "Udemo0000000000000000000000000005", lineName: "Ploy", fullName: null, phone: null, company: null, tags: [], points: 0 },
  { lineUserId: "Udemo0000000000000000000000000006", lineName: "Anan Cooling", fullName: "อนันต์ เย็นใจ", phone: "084-321-6547", company: "อนันต์คูลลิ่ง", tags: ["ช่างแอร์"], points: 310 },
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
    { dir: "INBOUND", text: "แต้มสะสมผมเหลือเท่าไหร่ครับ" },
    { dir: "OUTBOUND", text: "คงเหลือ 640 แต้มครับคุณธนากร" },
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

async function main() {
  await bootstrapAdmin();
  await normalizeData();

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
      if (c.points > 0) {
        await tx.pointTransaction.create({
          data: {
            customerId: customer.id,
            type: "EARN",
            amount: c.points,
            balanceAfter: c.points,
            reason: "ยอดยกมา (ข้อมูลตัวอย่าง)",
          },
        });
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          pointBalance: c.points,
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

  const count = await prisma.customer.count();
  console.log(`seed: เสร็จแล้ว — ลูกค้าในระบบ ${count} ราย`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
