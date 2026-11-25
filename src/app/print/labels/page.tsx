import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { LabelSheets } from "@/components/labels/label-sheets";
import { getCurrentUser } from "@/lib/auth";
import { bangkokDayKey } from "@/lib/deal-stages";
import { expandLabels, labelCarrierOf, MAX_BOXES, type LabelInput, type LabelLayout } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getSender } from "@/lib/sender";
import { PrintToolbar } from "./print-toolbar";

export const metadata: Metadata = { title: "ใบปะหน้าพัสดุ · CK CRM" };

const ItemSchema = z.object({
  name: z.string().max(200),
  company: z.string().max(200).optional(),
  phone: z.string().max(80).optional(),
  address: z.string().max(600),
  note: z.string().max(300).optional(),
  ref: z.string().max(80).optional(),
  carrier: z.enum(["flash", "ems", "kex", ""]),
  boxes: z.number().int().min(1).max(MAX_BOXES),
  date: z.string().max(20),
});

function decode(d: string): LabelInput[] {
  try {
    const json = Buffer.from(d.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const parsed = z.array(ItemSchema).max(100).safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

async function fromShipments(ids: string[]): Promise<LabelInput[]> {
  if (!ids.length) return [];
  const rows = await prisma.shipment.findMany({
    where: { id: { in: ids.slice(0, 100) } },
    orderBy: { shippedAt: "asc" },
    select: {
      boxes: true,
      shippedAt: true,
      carrier: { select: { id: true, name: true } },
      deal: { select: { quoteNo: true } },
      customer: { select: { fullName: true, lineName: true, company: true, phone: true, address: true, shippingNote: true } },
    },
  });
  return rows.map((r) => ({
    name: r.customer.fullName || r.customer.lineName || "",
    company: r.customer.company ?? "",
    phone: r.customer.phone ?? "",
    address: r.customer.address ?? "",
    note: r.customer.shippingNote ?? "",
    ref: r.deal?.quoteNo ?? "",
    carrier: labelCarrierOf(r.carrier),
    boxes: r.boxes ?? 1,
    date: bangkokDayKey(r.shippedAt),
  }));
}

async function Sheets({ searchParams }: { searchParams: PageProps<"/print/labels">["searchParams"] }) {
  await getCurrentUser();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const layout: LabelLayout = one("layout") === "2" ? "2" : "4";
  const items = one("d") ? decode(one("d")) : await fromShipments(one("s").split(",").map((x) => x.trim()).filter(Boolean));
  const labels = expandLabels(items);
  const sender = await getSender();
  const sheets = Math.ceil(labels.length / (layout === "4" ? 4 : 2));

  if (!labels.length) {
    return <p className="py-24 text-center text-sm text-muted-foreground">ไม่พบข้อมูลสำหรับพิมพ์ใบปะหน้า</p>;
  }
  return (
    <>
      <PrintToolbar layout={layout} count={labels.length} sheets={sheets} />
      <LabelSheets labels={labels} layout={layout} sender={sender} />
    </>
  );
}

export default function PrintLabelsPage(props: PageProps<"/print/labels">) {
  return (
    <main className="min-h-svh bg-muted pb-10 print:bg-white print:p-0">
      <Suspense fallback={<p className="py-24 text-center text-sm text-muted-foreground">กำลังเตรียมใบปะหน้า…</p>}>
        <Sheets searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
