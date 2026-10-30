import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { listTags } from "@/lib/customers";
import { canManage } from "@/lib/permissions";
import { PasswordForm } from "./password-form";
import { TagsManager } from "./tags-manager";

export const metadata: Metadata = { title: "ตั้งค่า · CK CRM" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="ตั้งค่า" description="จัดการแท็กลูกค้าและบัญชีของคุณ" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <TagsSection />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <AccountSection />
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

async function AccountSection() {
  const user = await getCurrentUser();
  return (
    <Card>
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
