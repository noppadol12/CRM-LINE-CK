# CK CRM — CRM เชื่อมต่อ LINE OA

Next.js (App Router) + Tailwind CSS + shadcn/ui + Prisma + Supabase Postgres, deploy บน Vercel

## โครงสร้างเฟส

| เฟส | งาน | สถานะ |
|---|---|---|
| 0 | Setup โปรเจกต์ + GitHub + Vercel | ✅ |
| 1 | Prisma schema + สร้างตารางอัตโนมัติ + seed | ✅ |
| 2 | ระบบล็อกอิน + Layout sidebar + แดชบอร์ดเบื้องต้น | ✅ |
| 3 | จัดการลูกค้า (ตาราง ค้นหา เพิ่ม/แก้/ลบ) + แท็ก + โน้ต + เปลี่ยนรหัสผ่าน | ✅ |
| 4 | LINE Webhook (ข้อความ / เพิ่มเพื่อน / บล็อก) + หน้าสถานะการเชื่อมต่อ | ✅ |
| 5 | หน้าแชท: อ่านประวัติ ดูรูป/ไฟล์ ตอบลูกค้าผ่าน LINE + โน้ต/แท็กข้างห้องแชท | ✅ |
| 6 | ระบบแต้ม (ledger) | ⏳ |
| 7 | Dashboard KPI + กราฟ | ⏳ |
| 8 | Hardening | ⏳ |

## ฐานข้อมูล

- Schema: `prisma/schema.prisma` (Prisma 7 + `@prisma/adapter-pg`)
- ทุกครั้งที่ Vercel build จะรัน `prisma db push` เพื่อสร้าง/อัปเดตตารางให้ตรงกับ schema อัตโนมัติ
  ถ้าการเปลี่ยนแปลงจะทำให้ข้อมูลหาย build จะหยุดเองเพื่อป้องกัน
- ตั้ง `SEED_DEMO=true` เพื่อใส่ข้อมูลตัวอย่าง (รันซ้ำได้ ไม่สร้างซ้ำ)
- เช็คการเชื่อมต่อ: เปิด `/api/health`

## ระบบล็อกอิน

- Session เข้ารหัสในคุกกี้ (iron-session) อายุ 7 วัน, รหัสผ่านเก็บแบบ bcrypt
- `src/proxy.ts` กันหน้าที่ต้องล็อกอิน (ด่านแรก) และ `getCurrentUser()` ใน `src/lib/auth.ts` ตรวจสิทธิ์จริงทุกครั้งที่อ่านข้อมูล
- บัญชีแรก: ตั้ง `ADMIN_EMAIL` + `ADMIN_PASSWORD` แล้ว deploy ระบบจะสร้างบัญชีเจ้าของให้
- ลืมรหัสผ่าน: ตั้ง `ADMIN_RESET_PASSWORD=true` พร้อม `ADMIN_PASSWORD` ใหม่ → redeploy → ลบตัวแปรออก

## LINE Webhook

- Endpoint: `POST /api/line/webhook` ตรวจลายเซ็นด้วย `LINE_CHANNEL_SECRET`
- event ทุกตัวบันทึกลง `webhook_events` ก่อน (กันประมวลผลซ้ำเมื่อ LINE ส่งซ้ำ) แล้วตอบ 200 ทันที ประมวลผลต่อด้วย `after()`
- รองรับ: follow, unfollow, message (ข้อความ รูป วิดีโอ เสียง ไฟล์ สติกเกอร์ ตำแหน่ง) เฉพาะแชท 1:1
- ดึงชื่อและรูปโปรไฟล์จาก LINE อัตโนมัติ (อัปเดตวันละครั้ง)
- ตั้งค่า: หน้า **ตั้งค่า → การเชื่อมต่อ LINE OA** กด "ตั้ง Webhook URL ให้อัตโนมัติ"

## หน้าแชท

- อัปเดตอัตโนมัติทุก 5 วินาที (หยุดเมื่อสลับแท็บ) เพราะ Vercel serverless ไม่มี WebSocket ถาวร
- ตอบลูกค้าด้วย Push API (นับโควตาข้อความของ OA) พร้อม retry key กันส่งซ้ำ
- รูป/วิดีโอ/เสียง/ไฟล์ดึงผ่าน `/api/line/content/:id` (ต้องล็อกอิน) — LINE เก็บไฟล์ไว้ชั่วคราวเท่านั้น
- ข้อความที่ทีมตอบจากแอป LINE OA Manager โดยตรง จะไม่ถูกส่งมาที่ webhook จึงไม่ปรากฏในประวัติ

## Environment Variables

ดู `.env.example` — ตั้งค่าบน Vercel ที่ **Settings → Environment Variables**

## Region

`vercel.json` กำหนดให้ Functions รันที่ **Singapore (sin1)** ให้ใกล้กับฐานข้อมูล Supabase

## รันบนเครื่อง (ไม่บังคับ)

```bash
npm install
cp .env.example .env   # แล้วใส่ค่าจริง
npm run dev
```
