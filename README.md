# CK CRM — CRM เชื่อมต่อ LINE OA

Next.js (App Router) + Tailwind CSS + shadcn/ui + Prisma + Supabase Postgres, deploy บน Vercel

## โครงสร้างเฟส

| เฟส | งาน | สถานะ |
|---|---|---|
| 0 | Setup โปรเจกต์ + GitHub + Vercel | ✅ |
| 1 | Prisma schema + สร้างตารางอัตโนมัติ + seed | ✅ |
| 2 | ระบบล็อกอิน + Layout sidebar + แดชบอร์ดเบื้องต้น | ✅ |
| 3 | Customers CRUD + แท็ก | ⏳ |
| 4 | LINE Webhook | ⏳ |
| 5 | หน้าแชท + โน้ตภายใน + ตอบกลับ | ⏳ |
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
