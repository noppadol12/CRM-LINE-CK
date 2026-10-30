# CK CRM — CRM เชื่อมต่อ LINE OA

Next.js (App Router) + Tailwind CSS + shadcn/ui + Prisma + Supabase Postgres, deploy บน Vercel

## โครงสร้างเฟส

| เฟส | งาน | สถานะ |
|---|---|---|
| 0 | Setup โปรเจกต์ + GitHub + Vercel | ✅ |
| 1 | Prisma schema + migrate + seed | ⏳ |
| 2 | ระบบล็อกอิน (Auth.js) + Layout sidebar | ⏳ |
| 3 | Customers CRUD + แท็ก | ⏳ |
| 4 | LINE Webhook | ⏳ |
| 5 | หน้าแชท + โน้ตภายใน + ตอบกลับ | ⏳ |
| 6 | ระบบแต้ม (ledger) | ⏳ |
| 7 | Dashboard KPI + กราฟ | ⏳ |
| 8 | Hardening | ⏳ |

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
