import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "แต้มสะสม · CK CRM" };

export default function PointsPage() {
  return (
    <>
      <PageHeader title="แต้มสะสม" description="ประวัติการเพิ่มและหักแต้มของลูกค้าทั้งหมด" />
      <ComingSoon
        icon={Gift}
        phase={6}
        title="ระบบแต้มสะสม"
        points={["เพิ่ม / หักแต้มพร้อมเหตุผลและเลขที่บิล", "ประวัติทุกรายการ ตรวจสอบย้อนหลังได้", "ยกเลิกรายการด้วยรายการกลับ ไม่แก้ข้อมูลเดิม"]}
      />
    </>
  );
}
