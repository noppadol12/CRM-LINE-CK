"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DealDTO } from "@/lib/deals";
import { DealCard } from "./deal-card";
import { DealFormDialog, type Owner } from "./deal-form-dialog";

/** รายการดีลของลูกค้าหนึ่งราย — ใช้ในหน้ารายละเอียดลูกค้าและข้างห้องแชท */
export function CustomerDeals({
  customer,
  deals,
  owners,
  canManage,
  compact,
}: {
  customer: { id: string; name: string };
  deals: DealDTO[];
  owners: Owner[];
  canManage: boolean;
  compact?: boolean;
}) {
  const open = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const closed = deals.filter((d) => d.stage === "WON" || d.stage === "LOST");
  const shown = compact ? [...open, ...closed.slice(0, 2)] : deals;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className={compact ? "text-xs font-medium text-muted-foreground" : "text-base font-semibold"}>
          ดีล {open.length > 0 && <span className="font-normal text-muted-foreground">· เปิดอยู่ {open.length}</span>}
        </p>
        <DealFormDialog
          owners={owners}
          customer={customer}
          trigger={
            <Button variant="outline" size="sm" className={compact ? "h-7 px-2 text-xs" : undefined}>
              <Plus />
              สร้างดีล
            </Button>
          }
        />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">ยังไม่มีดีล</p>
      ) : (
        <div className="space-y-2">
          {shown.map((d) => (
            <DealCard key={d.id} deal={d} owners={owners} canManage={canManage} showCustomer={false} />
          ))}
        </div>
      )}
    </div>
  );
}
