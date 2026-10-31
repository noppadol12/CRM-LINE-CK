import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { listTags } from "@/lib/customers";
import { canManage } from "@/lib/permissions";
import { LineConnection } from "./line-connection";
import { PasswordForm } from "./password-form";
import { QuickRepliesManager } from "./quick-replies-manager";
import { listQuickReplies } from "@/lib/quick-replies";
import { TagsManager } from "./tags-manager";
import { DemoData } from "./demo-data";
import { DeviceSettings } from "./device-settings";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriveResultToast } from "./drive-actions";
import { DriveStorage } from "./drive-storage";
import { TeamManager } from "./team-manager";
import { StagesManager } from "./stages-manager";
import { listStages } from "@/lib/stages";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { canManageMember, listTeam, rolesAssignableBy } from "@/lib/team";

export const metadata: Metadata = { title: "ตั้งค่า · CK CRM" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="ตั้งค่า" description="ทีมงาน ข้อความสำเร็จรูป แท็ก การเชื่อมต่อ LINE OA / Google Drive และบัญชีของคุณ" />
      <Suspense fallback={null}>
        <DriveResultToast />
      </Suspense>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
            <TeamSection />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
            <StagesSection />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <QuickRepliesSection />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <TagsSection />
          </Suspense>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
            <AccountSection />
          </Suspense>
          <Card id="device" className="scroll-mt-24">
            <CardHeader>
              <CardTitle>แจ้งเตือนและแอปมือถือ</CardTitle>
              <CardDescription>ตั้งค่าแยกแต่ละเครื่อง (มือถือ / คอมพิวเตอร์) ที่คุณใช้</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceSettings />
            </CardContent>
          </Card>
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <LineConnection />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
            <DriveStorage />
          </Suspense>
          <Suspense fallback={null}>
            <BackupSection />
          </Suspense>
          <Suspense fallback={null}>
            <DemoData />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function TagsSection() {
  const user = await getCurrentUser();
  const tags = await listTags();
  return (
    <Card id="tags" className="scroll-mt-24 gap-0 pb-0">
      <CardHeader className="border-b pb-5">
        <CardTitle>แท็กลูกค้า</CardTitle>
        <CardDescription>ใช้จัดกลุ่มลูกค้า เช่น ประเภทลูกค้า สินค้าที่สนใจ ระดับ VIP</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <TagsManager
          tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.customers }))}
          canEdit={canManage(user)}
        />
      </CardContent>
    </Card>
  );
}

async function StagesSection() {
  const user = await getCurrentUser();
  const [stages, counts] = await Promise.all([listStages(), prisma.deal.groupBy({ by: ["stage"], _count: true })]);
  return (
    <Card id="stages" className="scroll-mt-24 gap-0 pb-0">
      <CardHeader className="border-b pb-5">
        <CardTitle>ขั้นตอนดีล</CardTitle>
        <CardDescription>คอลัมน์บนบอร์ดดีล เพิ่ม เปลี่ยนชื่อ สี และลำดับได้ตามวิธีขายของร้าน</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <StagesManager
          canEdit={canManage(user)}
          stages={stages.map((s) => ({ ...s, count: counts.find((c) => c.stage === s.id)?._count ?? 0 }))}
        />
      </CardContent>
    </Card>
  );
}

async function QuickRepliesSection() {
  const user = await getCurrentUser();
  const replies = await listQuickReplies();
  return (
    <Card id="quick-replies" className="scroll-mt-24 gap-0 pb-0">
      <CardHeader className="border-b pb-5">
        <CardTitle>ข้อความสำเร็จรูป</CardTitle>
        <CardDescription>กดปุ่ม ⚡ ในห้องแชทเพื่อแทรกข้อความที่ตอบบ่อย เช่น เลขบัญชี ค่าส่ง เวลาเปิดร้าน</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <QuickRepliesManager replies={replies} canEdit={canManage(user)} />
      </CardContent>
    </Card>
  );
}

async function TeamSection() {
  const user = await getCurrentUser();
  const team = await listTeam();
  const manager = canManage(user);
  return (
    <Card id="team" className="scroll-mt-24 gap-0 pb-0">
      <CardHeader className="border-b pb-5">
        <CardTitle>ทีมงาน</CardTitle>
        <CardDescription>
          {manager ? "เพิ่มบัญชีให้ทีมขาย กำหนดสิทธิ์ รีเซ็ตรหัสผ่าน หรือปิดบัญชีคนที่ลาออก" : "รายชื่อผู้ใช้ระบบ"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <TeamManager
          assignableRoles={rolesAssignableBy(user)}
          members={team.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            isActive: m.isActive,
            mustChangePassword: m.mustChangePassword,
            lastLogin: m.lastLoginAt ? formatDateTime(m.lastLoginAt) : null,
            manageable: canManageMember(user, m),
            isSelf: m.id === user.id,
          }))}
        />
      </CardContent>
    </Card>
  );
}

async function BackupSection() {
  const user = await getCurrentUser();
  if (!canManage(user)) return null;
  const files = [
    { kind: "customers", label: "ลูกค้า" },
    { kind: "messages", label: "ประวัติแชท" },
    { kind: "deals", label: "ดีล" },
    { kind: "shipments", label: "ประวัติการส่ง" },
    { kind: "carriers", label: "ขนส่ง × จังหวัด" },
  ];
  return (
    <Card id="backup" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>สำรองข้อมูล</CardTitle>
        <CardDescription>ดาวน์โหลดเป็นไฟล์ CSV เปิดด้วย Excel หรือ Google Sheets ได้ (ภาษาไทยแสดงถูกต้อง) แนะนำให้เก็บไว้เดือนละครั้ง</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {files.map((f) => (
          <Button key={f.kind} variant="outline" asChild>
            <a href={`/api/export/${f.kind}`} download>
              <Download />
              {f.label}
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

async function AccountSection() {
  const user = await getCurrentUser();
  return (
    <Card id="account" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>บัญชีของฉัน</CardTitle>
        <CardDescription>
          {user.name} · {user.email} · {ROLE_LABEL[user.role]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PasswordForm />
      </CardContent>
    </Card>
  );
}
