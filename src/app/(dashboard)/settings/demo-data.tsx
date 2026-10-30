import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_LINE_PREFIX } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { PurgeDemoButton } from "./purge-demo-button";

/** แสดงเฉพาะเจ้าของ และเฉพาะเมื่อยังมีลูกค้าตัวอย่างอยู่ */
export async function DemoData() {
  const user = await getCurrentUser();
  if (user.role !== "OWNER") return null;
  const count = await prisma.customer.count({ where: { lineUserId: { startsWith: DEMO_LINE_PREFIX } } });
  if (count === 0) return null;
  const seedOn = process.env.SEED_DEMO === "true";

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลตัวอย่าง</CardTitle>
        <CardDescription>มีลูกค้าตัวอย่าง {count} ราย (พร้อมแชท โน้ต และดีลตัวอย่าง) ลบออกก่อนเริ่มใช้งานจริง</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {seedOn && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              ลบตัวแปร <code>SEED_DEMO</code> ใน Vercel ก่อน ไม่งั้น deploy ครั้งถัดไปจะสร้างข้อมูลตัวอย่างกลับมา
            </span>
          </p>
        )}
        <PurgeDemoButton count={count} />
      </CardContent>
    </Card>
  );
}
