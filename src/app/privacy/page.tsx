import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว · CK CRM" };

/** หน้าสาธารณะ — ใช้ประกอบการตั้งค่า OAuth ของ Google (ลิงก์ Privacy policy) */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-12 text-sm leading-relaxed">
      <BrandMark />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-muted-foreground">Privacy Policy · ปรับปรุงล่าสุด 30 ตุลาคม 2569</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">เกี่ยวกับระบบนี้</h2>
        <p>
          CK CRM เป็นระบบภายในของ CK Aircondition (www.ckaircond.com) สำหรับทีมงานใช้ดูแลลูกค้าที่ติดต่อผ่าน LINE Official Account
          ไม่เปิดให้บุคคลภายนอกสมัครใช้งาน
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">ข้อมูลที่เก็บ</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>ข้อมูลโปรไฟล์ LINE ของลูกค้าที่เพิ่มเพื่อนหรือทักแชท (ชื่อที่แสดง รูปโปรไฟล์ LINE User ID)</li>
          <li>ข้อความ รูปภาพ และไฟล์ที่ลูกค้าส่งมาทางแชท</li>
          <li>ข้อมูลติดต่อที่ลูกค้าให้ไว้ เช่น ชื่อ เบอร์โทร ที่อยู่จัดส่ง และประวัติการสั่งซื้อ/ใบเสนอราคา</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">การใช้ Google Drive</h2>
        <p>
          ระบบขอสิทธิ์ Google Drive ระดับ <code>drive.file</code> เท่านั้น เพื่อจัดเก็บรูปและไฟล์ที่ลูกค้าส่งมาทาง LINE ไว้ใน Google Drive
          ของบริษัท ระบบเข้าถึงได้เฉพาะไฟล์ที่ระบบสร้างขึ้นเอง ไม่สามารถมองเห็นหรือแก้ไขไฟล์อื่นใน Drive และไม่แชร์ไฟล์แก่สาธารณะ
        </p>
        <p>
          The app requests only the <code>drive.file</code> scope to store media received from customers via LINE in the company&apos;s
          own Google Drive. It can access only files it creates. Google user data is not shared with third parties, not used for
          advertising, and not used to train AI models.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">การเปิดเผยและความปลอดภัย</h2>
        <p>
          ข้อมูลใช้เพื่อการติดต่อ ขาย และบริการหลังการขายเท่านั้น ไม่ขายหรือเปิดเผยแก่บุคคลภายนอก การเข้าถึงจำกัดเฉพาะทีมงานที่มีบัญชีผู้ใช้
          ข้อมูลรับส่งผ่านการเข้ารหัส (HTTPS)
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">สิทธิ์ของเจ้าของข้อมูล</h2>
        <p>ลูกค้าขอดู แก้ไข หรือลบข้อมูลของตนได้ โดยแจ้งผ่านแชท LINE Official Account ของ CK Aircondition</p>
      </section>
    </main>
  );
}
