import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock, ExternalLink, MapPin, MessageCircle, Pencil, Phone, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CarrierFormDialog } from "@/components/shipping/carrier-form-dialog";
import { getCurrentUser } from "@/lib/auth";
import { displayName, formatPhone } from "@/lib/format";
import { canManage } from "@/lib/permissions";
import { CARRIER_KINDS, PAYMENT_LABEL } from "@/lib/provinces";
import { getCarrier, toShipmentDTO } from "@/lib/shipping";
import { thNumber } from "@/lib/utils";
import { ShipmentsTable } from "../../shipments-table";
import { CoverageManager } from "./coverage-manager";
import { DeleteCarrierButton } from "./delete-carrier-button";

export const metadata: Metadata = { title: "ขนส่ง · CK CRM" };

export default function CarrierPage({ params }: PageProps<"/shipping/carriers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <CarrierDetail params={params} />
    </Suspense>
  );
}

async function CarrierDetail({ params }: { params: PageProps<"/shipping/carriers/[id]">["params"] }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const c = await getCarrier(id);
  if (!c) notFound();

  const customers = [
    ...c.primaryCustomers.map((x) => ({ ...x, role: "หลัก" })),
    ...c.backupCustomers.map((x) => ({ ...x, role: "สำรอง" })),
  ].sort((a, b) => (a.province ?? "ฮ").localeCompare(b.province ?? "ฮ", "th"));

  const info = [
    c.phone && { icon: Phone, text: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` },
    c.lineId && { icon: MessageCircle, text: `LINE ${c.lineId}` },
    c.dropoffAddress && { icon: MapPin, text: c.dropoffAddress, href: c.mapUrl ?? undefined },
    c.cutoffTime && { icon: Clock, text: `ปิดรับของ ${c.cutoffTime}` },
    c.payment && { icon: Wallet, text: PAYMENT_LABEL[c.payment] },
  ].filter(Boolean) as { icon: typeof Phone; text: string; href?: string }[];

  return (
    <>
      <div className="space-y-3">
        <Link href="/shipping?tab=carriers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> บริษัทขนส่ง
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">{CARRIER_KINDS[c.kind] ?? c.kind}</Badge>
              {!c.isActive && <Badge variant="outline">เลิกใช้</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <CarrierFormDialog
              carrier={c}
              trigger={
                <Button variant="outline">
                  <Pencil /> แก้ไข
                </Button>
              }
            />
            {canManage(user) && <DeleteCarrierButton id={c.id} name={c.name} />}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลติดต่อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {info.length === 0 && <p className="text-muted-foreground">ยังไม่มีข้อมูล — กด “แก้ไข” เพื่อเพิ่ม</p>}
              {info.map((i) => (
                <p key={i.text} className="flex gap-2.5">
                  <i.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {i.href ? (
                    <a href={i.href} target={i.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-primary hover:underline">
                      {i.text}
                      {i.href.startsWith("http") && <ExternalLink className="ml-1 inline size-3" />}
                    </a>
                  ) : (
                    <span className="whitespace-pre-wrap">{i.text}</span>
                  )}
                </p>
              ))}
              {c.priceNote && (
                <div className="border-t pt-2.5">
                  <p className="text-xs text-muted-foreground">ราคา / เงื่อนไข</p>
                  <p className="whitespace-pre-wrap">{c.priceNote}</p>
                </div>
              )}
              {c.note && (
                <div className="border-t pt-2.5">
                  <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                  <p className="whitespace-pre-wrap">{c.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 pb-0">
            <CardHeader className="border-b pb-4">
              <CardTitle>ลูกค้าที่ใช้ ({thNumber.format(customers.length)})</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {customers.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">ยังไม่มีลูกค้าเลือกขนส่งเจ้านี้</p>
              ) : (
                <ul className="divide-y">
                  {customers.map((x) => (
                    <li key={`${x.id}-${x.role}`}>
                      <Link href={x.lineUserId ? `/chats?c=${x.id}` : `/customers/${x.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-accent">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{displayName(x)}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[x.province, x.company, x.phone && formatPhone(x.phone)].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                        <Badge variant={x.role === "หลัก" ? "soft" : "outline"}>{x.role}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card id="coverage" className="gap-0 pb-0">
            <CardHeader className="border-b pb-4">
              <CardTitle>จังหวัดที่ไป ({thNumber.format(c.coverage.length)})</CardTitle>
              <CardDescription>ระบุสาขา/ท่ารถปลายทาง เบอร์ และระยะเวลา เพื่อแจ้งลูกค้าได้ถูกต้อง</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <CoverageManager carrierId={c.id} coverage={c.coverage.map(({ province, branch, phone, transitDays, note }) => ({ province, branch, phone, transitDays, note }))} />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="font-semibold">การส่งล่าสุด</h2>
            <ShipmentsTable
              hideFilters
              rows={c.shipments.map((s) => toShipmentDTO({ ...s, carrier: { id: c.id, name: c.name, trackingUrl: c.trackingUrl }, deal: null, createdBy: null, customer: { ...s.customer, province: null } }))}
              carriers={[]}
              carrierId=""
              q=""
            />
            {c.shipments.length >= 20 && (
              <Link href={`/shipping?tab=shipments&carrier=${c.id}`} className="text-sm text-primary hover:underline">
                ดูทั้งหมด
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
