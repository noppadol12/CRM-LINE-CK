import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ArrowLeft, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { displayName, formatPhone } from "@/lib/format";
import { CARRIER_KINDS, isProvince, PAYMENT_LABEL, regionOf } from "@/lib/provinces";
import { carrierOptions, getProvince } from "@/lib/shipping";
import { thNumber } from "@/lib/utils";
import { AddCarrierToProvince } from "./add-carrier";

export async function generateMetadata({ params }: PageProps<"/shipping/provinces/[province]">): Promise<Metadata> {
  const { province } = await params;
  return { title: `ขนส่ง${decodeURIComponent(province)} · CK CRM` };
}

export default function ProvincePage({ params }: PageProps<"/shipping/provinces/[province]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <ProvinceDetail params={params} />
    </Suspense>
  );
}

async function ProvinceDetail({ params }: { params: PageProps<"/shipping/provinces/[province]">["params"] }) {
  await getCurrentUser();
  const province = decodeURIComponent((await params).province);
  if (!isProvince(province)) notFound();
  const [{ coverage, customers }, carriers] = await Promise.all([getProvince(province), carrierOptions()]);
  const covered = new Set(coverage.map((c) => c.carrierId));
  const usage = new Map<string, number>();
  for (const c of customers) if (c.carrierId) usage.set(c.carrierId, (usage.get(c.carrierId) ?? 0) + 1);

  return (
    <>
      <div className="space-y-3">
        <Link href="/shipping" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> ทุกจังหวัด
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{province}</h1>
          <p className="text-sm text-muted-foreground">
            {regionOf(province)?.name} · ขนส่ง {thNumber.format(coverage.length)} เจ้า · ลูกค้า {thNumber.format(customers.length)} ราย
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="gap-0 pb-0 lg:col-span-3">
          <CardHeader className="flex-row items-start justify-between gap-3 border-b pb-4">
            <div className="space-y-1">
              <CardTitle>ขนส่งที่ไป{province}</CardTitle>
              <CardDescription>สาขา/ท่ารถปลายทางสำหรับแจ้งลูกค้า</CardDescription>
            </div>
            <AddCarrierToProvince province={province} carriers={carriers.filter((c) => c.isActive && !covered.has(c.id)).map((c) => ({ id: c.id, name: c.name }))} />
          </CardHeader>
          <CardContent className="px-0">
            {coverage.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground">
                {customers.length > 0 ? <AlertTriangle className="size-8 text-amber-500" /> : <Truck className="size-8 text-muted-foreground/50" />}
                {customers.length > 0 ? `มีลูกค้า ${customers.length} รายแต่ยังไม่มีขนส่งที่ไปจังหวัดนี้` : "ยังไม่มีขนส่งที่ไปจังหวัดนี้"}
              </div>
            ) : (
              <ul className="divide-y">
                {coverage.map((c) => (
                  <li key={c.carrierId} className={c.carrier.isActive ? "" : "opacity-60"}>
                    <Link href={`/shipping/carriers/${c.carrierId}`} className="block px-5 py-3 hover:bg-accent">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.carrier.name}</span>
                        <Badge variant="secondary">{CARRIER_KINDS[c.carrier.kind] ?? c.carrier.kind}</Badge>
                        {!c.carrier.isActive && <Badge variant="outline">เลิกใช้</Badge>}
                        {usage.get(c.carrierId) ? (
                          <span className="ml-auto text-xs text-muted-foreground">ลูกค้าใช้ {usage.get(c.carrierId)} ราย</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          c.branch && `ปลายทาง: ${c.branch}`,
                          c.phone && `โทร ${c.phone}`,
                          c.transitDays,
                          c.carrier.payment && PAYMENT_LABEL[c.carrier.payment],
                          c.carrier.cutoffTime && `ปิดรับ ${c.carrier.cutoffTime}`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "ยังไม่ระบุสาขาปลายทาง"}
                      </p>
                      {c.note && <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>ลูกค้าใน{province}</CardTitle>
            <CardDescription>ตั้งจังหวัดและขนส่งของลูกค้าได้ที่หน้าลูกค้า หรือข้างห้องแชท</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {customers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">ยังไม่มีลูกค้าที่ระบุจังหวัดนี้</p>
            ) : (
              <ul className="divide-y">
                {customers.map((c) => (
                  <li key={c.id}>
                    <Link href={c.lineUserId ? `/chats?c=${c.id}` : `/customers/${c.id}`} className="block px-5 py-2.5 hover:bg-accent">
                      <p className="truncate text-sm font-medium">{displayName(c)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.carrier ? (
                          <span className="text-foreground">{c.carrier.name}</span>
                        ) : (
                          <span className="text-amber-700">ยังไม่ระบุขนส่ง</span>
                        )}
                        {c.backupCarrier && ` · สำรอง ${c.backupCarrier.name}`}
                        {c.phone && ` · ${formatPhone(c.phone)}`}
                      </p>
                      {c.shippingNote && <p className="truncate text-xs text-muted-foreground">{c.shippingNote}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
