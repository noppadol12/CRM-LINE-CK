import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "แชท · CK CRM" };

export default function ChatsPage() {
  return (
    <>
      <PageHeader title="แชท" description="ประวัติการสนทนากับลูกค้าผ่าน LINE OA" />
      <ComingSoon
        icon={MessagesSquare}
        phase={5}
        title="กล่องข้อความ"
        points={["รายชื่อห้องแชท เรียงตามข้อความล่าสุด", "อ่านประวัติและตอบลูกค้าจากหลังบ้าน", "โน้ตภายในที่ลูกค้ามองไม่เห็น"]}
      />
    </>
  );
}
