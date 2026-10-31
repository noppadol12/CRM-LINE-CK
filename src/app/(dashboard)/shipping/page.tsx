import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Clock, MapPin, Phone, Plus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CarrierFormDialog } from "@/components/shipping/carrier-form-dialog";
import { getCurrentUser } from "@/lib/auth";
import { baht } from "@/lib/deal-stages";
import { CARRIER_KINDS, PAYMENT_LABEL } from "@/lib/provinces";
import { listCarriers, listShipments, provinceOverview, toShipmentDTO } from "@/lib/shipping";
import { cn, thNumber } from "@/lib/utils";
import { ProvinceGrid } from "./province-grid";
import { ShipmentsTable } from "./shipments-table";

export const metadata: Metadata = { title: "ขนส่ง · CK CRM" };

const TABS = [
  { key: "provinces", label: "ตามจังหวัด" },
  { key: "carriers", label: "บริษัทขนส่ง" },
  { key: "shipments", label: "ประวัติการส่ง" },
] as const;

export default function ShippingPage({ searchParams }: PageProps<"/shipping">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Shipping searchParams={searchParams} />
    </Suspense>
  );
}

async function Shipping({ searchParams }: { searchParams: PageProps<"/shipping">["searchParams"] }) {
  await getCurrentUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "provinces";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">ขนส่ง</h1>
          <p className="text-sm text-muted-foreground">ขนส่งเอกชนแยกตามจังหวัด ลูกค้าแต่ละรายใช้เจ้าไหน และประวัติการส่งของ</p>
        </div>
        <CarrierFormDialog
          trigger={
            <Button>
              <Plus />
              เพิ่มบริษัทขนส่ง
            </Button>
          }
        />
      </div>

      <nav className="inline-flex w-fit rounded-md border bg-muted/60 p-0.5" aria-label="มุมมอง">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "provinces" ? "/shipping" : `/shipping?tab=${t.key}`}
            replace
            scroll={false}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "h-8 rounded px-3 text-sm leading-8 whitespace-nowrap transition-colors",
              t.key === tab ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "provinces" && <ProvincesTab />}
      {tab === "carriers" && <CarriersTab />}
      {tab === "shipments" && <ShipmentsTab carrierId={typeof sp.carrier === "string" ? sp.carrier : undefined} q={typeof sp.q === "string" ? sp.q : undefined} />}
    </>
  );
}

async function ProvincesTab() {
  const stats = await provinceOverview();
  return <ProvinceGrid stats={stats} />;
}

async function CarriersTab() {
  const carriers = await listCarriers();
  if (carriers.length === 0) {
    return (
      <Card className="items-center gap-3 py-14 text-center">
        <Truck className="size-10 text-muted-foreground/50" />
        <p className="font-medium">ยังไม่มีบริษัทขนส่ง</p>
        <p className="text-sm text-muted-foreground">เพิ่มขนส่งที่ร้านใช้ แล้วเลือกจังหวัดที่แต่ละเจ้าไป</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {carriers.map((c) => {
        const customers = c._count.primaryCustomers + c._count.backupCustomers;
        return (
          <Link key={c.id} href={`/shipping/carriers/${c.id}`} className={cn("group", !c.isActive && "opacity-60")}>
            <Card className="h-full gap-3 p-5 transition-shadow group-hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Truck className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">{CARRIER_KINDS[c.kind] ?? c.kind}</Badge>
                    {c.payment && <Badge variant="outline">{PAYMENT_LABEL[c.payment]}</Badge>}
                    {!c.isActive && <Badge variant="outline">เลิกใช้</Badge>}
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {c.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="truncate">{c.phone}</span>
                  </p>
                )}
                {c.dropoffAddress && (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{c.dropoffAddress}</span>
                  </p>
                )}
                {c.cutoffTime && (
                  <p className="flex items-center gap-2">
                    <Clock className="size-3.5 shrink-0" />
                    ปิดรับ {c.cutoffTime}
                  </p>
                )}
              </div>
              <div className="mt-auto grid grid-cols-3 border-t pt-3 text-center text-sm">
                <div>
                  <p className="font-semibold tabular-nums">{thNumber.format(c._count.coverage)}</p>
                  <p className="text-xs text-muted-foreground">จังหวัด</p>
                </div>
                <div>
                  <p className="font-semibold tabular-nums">{thNumber.format(customers)}</p>
                  <p className="text-xs text-muted-foreground">ลูกค้า</p>
                </div>
                <div>
                  <p className="font-semibold tabular-nums">{thNumber.format(c._count.shipments)}</p>
                  <p className="text-xs text-muted-foreground">ครั้งที่ส่ง</p>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

async function ShipmentsTab({ carrierId, q }: { carrierId?: string; q?: string }) {
  const [rows, carriers] = await Promise.all([listShipments({ carrierId, q }), listCarriers()]);
  const total = rows.reduce((s, r) => s + (r.cost == null ? 0 : Number(r.cost)), 0);
  return (
    <ShipmentsTable
      rows={rows.map(toShipmentDTO)}
      carriers={carriers.map((c) => ({ id: c.id, name: c.name }))}
      carrierId={carrierId ?? ""}
      q={q ?? ""}
      summary={`${thNumber.format(rows.length)} รายการ${rows.length >= 200 ? " (ล่าสุด 200)" : ""} · ค่าส่งรวม ${baht.format(total)}`}
    />
  );
}
