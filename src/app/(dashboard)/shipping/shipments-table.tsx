"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, PackageCheck, Pencil, Printer, Search, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteShipment } from "@/actions/shipping";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ShipmentDialog } from "@/components/shipping/shipment-dialog";
import { LabelDialog } from "@/components/labels/label-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { baht } from "@/lib/deal-stages";
import { displayName } from "@/lib/format";
import { trackingLink } from "@/lib/provinces";
import type { ShipmentDTO } from "@/lib/shipping";

const dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });

export function ShipmentsTable({
  rows,
  carriers,
  carrierId,
  q: initialQ,
  summary,
  hideFilters,
}: {
  rows: ShipmentDTO[];
  carriers: { id: string; name: string }[];
  carrierId: string;
  q: string;
  summary?: string;
  hideFilters?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [edit, setEdit] = useState<ShipmentDTO | null>(null);
  const [del, setDel] = useState<ShipmentDTO | null>(null);
  const [label, setLabel] = useState<ShipmentDTO | null>(null);
  // เลือกหลายรายการ → พิมพ์ใบปะหน้ารวดเดียว
  const [picked, setPicked] = useState<string[]>([]);
  const visibleIds = rows.map((r) => r.id);
  const pickedVisible = picked.filter((id) => visibleIds.includes(id));
  const allPicked = rows.length > 0 && pickedVisible.length === rows.length;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const printPicked = () => {
    let layout = "4";
    try {
      layout = localStorage.getItem("ck-label-layout") === "2" ? "2" : "4";
    } catch {}
    window.open(`/print/labels?layout=${layout}&s=${pickedVisible.join(",")}`, "_blank");
  };

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  useEffect(() => {
    if (hideFilters || (params.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => setParam("q", q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-3">
      {!hideFilters && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex items-center sm:w-72">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาเลขพัสดุ ชื่อลูกค้า"
              aria-label="ค้นหาการส่ง"
              className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
          </label>
          <select
            value={carrierId}
            onChange={(e) => setParam("carrier", e.target.value || null)}
            aria-label="ขนส่ง"
            className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none sm:w-56"
          >
            <option value="">ทุกขนส่ง</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {summary && <p className="text-sm text-muted-foreground sm:ml-auto">{summary}</p>}
        </div>
      )}

      {pickedVisible.length > 0 && (
        <div className="sticky top-16 z-20 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary-soft px-3 py-2 text-sm">
          <span className="font-medium text-primary-soft-foreground">เลือก {pickedVisible.length} รายการ</span>
          <Button size="sm" className="ml-auto" onClick={printPicked}>
            <Printer /> พิมพ์ใบปะหน้า
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="ยกเลิกการเลือก" onClick={() => setPicked([])}>
            <X />
          </Button>
        </div>
      )}

      {/* มือถือ: การ์ดแทนตาราง */}
      <ul className="divide-y rounded-xl border bg-card sm:hidden">
        {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">ยังไม่มีการบันทึกการส่งของ</li>}
        {rows.map((s) => {
          const link = trackingLink(s.carrier?.trackingUrl, s.trackingNo);
          return (
            <li key={s.id} className="flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={picked.includes(s.id)}
                onChange={() => toggle(s.id)}
                aria-label={`เลือก ${displayName(s.customer)}`}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex items-center gap-2 text-sm">
                  <Link href={`/customers/${s.customer.id}`} className="truncate font-medium">
                    {displayName(s.customer)}
                  </Link>
                  {s.cost != null && <span className="ml-auto shrink-0 tabular-nums">{baht.format(s.cost)}</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {dateFmt.format(s.shippedAt)} · {s.carrier?.name ?? "ไม่ระบุขนส่ง"}
                  {s.customer.province && ` · ${s.customer.province}`}
                </p>
                {s.trackingNo && (
                  <p className="flex items-center gap-1.5 text-xs">
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="font-mono text-primary">
                        {s.trackingNo}
                      </a>
                    ) : (
                      <span className="font-mono">{s.trackingNo}</span>
                    )}
                    {s.notifiedAt && <Send className="size-3 text-primary" aria-label="แจ้งลูกค้าแล้ว" />}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mr-2" aria-label="เมนู">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEdit(s)}>
                    <Pencil /> แก้ไข / ส่งเลขพัสดุ
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLabel(s)}>
                    <Printer /> พิมพ์ใบปะหน้า
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDel(s)}>
                    <Trash2 /> ลบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? [] : visibleIds)}
                  aria-label="เลือกทั้งหมด"
                  className="size-4 accent-primary align-middle"
                />
              </th>
              <th className="px-3 py-2.5 text-left font-medium">วันที่</th>
              <th className="px-3 py-2.5 text-left font-medium">ลูกค้า</th>
              <th className="px-3 py-2.5 text-left font-medium">ขนส่ง</th>
              <th className="px-3 py-2.5 text-left font-medium">เลขพัสดุ</th>
              <th className="px-3 py-2.5 text-right font-medium">ค่าส่ง</th>
              <th className="px-3 py-2.5 text-left font-medium">ดีล</th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <PackageCheck className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  ยังไม่มีการบันทึกการส่งของ — บันทึกได้จากหน้าลูกค้า ข้างห้องแชท หรือเมนูของการ์ดดีล
                </td>
              </tr>
            )}
            {rows.map((s) => {
              const link = trackingLink(s.carrier?.trackingUrl, s.trackingNo);
              return (
                <tr key={s.id} className={picked.includes(s.id) ? "bg-primary-soft/40" : "hover:bg-muted/30"}>
                  <td className="pl-4">
                    <input
                      type="checkbox"
                      checked={picked.includes(s.id)}
                      onChange={() => toggle(s.id)}
                      aria-label={`เลือก ${displayName(s.customer)}`}
                      className="size-4 accent-primary align-middle"
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{dateFmt.format(s.shippedAt)}</td>
                  <td className="max-w-48 px-3 py-2.5">
                    <Link href={`/customers/${s.customer.id}`} className="block truncate font-medium hover:underline">
                      {displayName(s.customer)}
                    </Link>
                    {s.customer.province && <span className="text-xs text-muted-foreground">{s.customer.province}</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {s.carrier ? (
                      <Link href={`/shipping/carriers/${s.carrier.id}`} className="hover:underline">
                        {s.carrier.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {s.trackingNo ? (
                        link ? (
                          <a href={link} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline">
                            {s.trackingNo}
                          </a>
                        ) : (
                          <span className="font-mono">{s.trackingNo}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {s.notifiedAt && (
                        <span title="ส่งเลขพัสดุให้ลูกค้าแล้ว">
                          <Send className="size-3 text-primary" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{s.cost == null ? "—" : baht.format(s.cost)}</td>
                  <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">{s.dealTitle ?? "—"}</td>
                  <td className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="เมนู">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEdit(s)}>
                          <Pencil /> แก้ไข / ส่งเลขพัสดุ
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setLabel(s)}>
                          <Printer /> พิมพ์ใบปะหน้า
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDel(s)}>
                          <Trash2 /> ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {edit && (
        <ShipmentDialog
          customerId={edit.customer.id}
          shipment={{ ...edit, carrier: edit.carrier ? { id: edit.carrier.id } : null }}
          open
          onOpenChange={(o) => !o && setEdit(null)}
        />
      )}
      {label && <LabelDialog customerId={label.customer.id} shipmentId={label.id} open onOpenChange={(o) => !o && setLabel(null)} />}
      <ConfirmDialog
        open={Boolean(del)}
        onOpenChange={(o) => !o && setDel(null)}
        title="ลบรายการส่งของนี้?"
        description="ลบเฉพาะบันทึกในระบบ ไม่กระทบข้อความที่ส่งให้ลูกค้าไปแล้ว"
        confirmLabel="ลบ"
        onConfirm={async () => {
          if (!del) return;
          const r = await deleteShipment(del.id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        }}
      />
    </div>
  );
}
