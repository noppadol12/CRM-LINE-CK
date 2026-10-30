import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "ลูกค้า · CK CRM" };

export default function CustomersPage() {
  return (
    <>
      <PageHeader title="ลูกค้า" description="รายชื่อลูกค้าทั้งหมดจาก LINE OA และที่เพิ่มเอง" />
      <ComingSoon
        icon={Users}
        phase={3}
        title="จัดการข้อมูลลูกค้า"
        points={["ตารางลูกค้า ค้นหา กรองตามแท็ก", "เพิ่ม / แก้ไข / ลบลูกค้า", "หน้ารายละเอียด: ข้อมูล แชท แต้ม โน้ต"]}
      />
    </>
  );
}
