import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "ตั้งค่า · CK CRM" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="ตั้งค่า" description="จัดการทีมงาน แท็ก และการเชื่อมต่อ LINE" />
      <ComingSoon
        icon={Settings}
        phase={3}
        title="ตั้งค่าระบบ"
        points={["เพิ่มทีมงานและกำหนดสิทธิ์", "จัดการแท็กลูกค้า", "สถานะการเชื่อมต่อ LINE OA"]}
      />
    </>
  );
}
