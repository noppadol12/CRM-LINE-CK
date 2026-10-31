import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { FileText, Handshake, MessageSquare, PackageCheck, Search, StickyNote, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { findStage } from "@/lib/deal-stages";
import { displayName, formatDateTime, formatPhone } from "@/lib/format";
import { searchAll } from "@/lib/search";
import { listStages } from "@/lib/stages";
import { thNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "ค้นหา · CK CRM" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

/** ตัดข้อความรอบคำที่ค้น แล้วไฮไลต์ */
function Snippet({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text.slice(0, 140)}</>;
  const start = Math.max(0, i - 50);
  const end = Math.min(text.length, i + q.length + 80);
  return (
    <>
      {start > 0 && "…"}
      {text.slice(start, i)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length, end)}
      {end < text.length && "…"}
    </>
  );
}

function Section({ icon: Icon, title, count, children }: { icon: typeof Users; title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title} <span className="text-sm font-normal text-muted-foreground">({count})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y">{children}</ul>
      </CardContent>
    </Card>
  );
}

type Who = { id: string; fullName: string | null; lineName: string | null; lineUserId: string | null };
const chatHref = (c: Who) => (c.lineUserId ? `/chats?c=${c.id}` : `/customers/${c.id}`);

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  await getCurrentUser();
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);

  if (q.length < 2) {
    return (
      <Card className="items-center gap-2 py-14 text-center text-sm text-muted-foreground">
        <Search className="size-8 text-muted-foreground/50" />
        พิมพ์อย่างน้อย 2 ตัวอักษรที่ช่องค้นหาด้านบน — ค้นได้ทั้งชื่อลูกค้า เบอร์โทร ข้อความในแชท ดีล โน้ต และเลขพัสดุ
      </Card>
    );
  }

  const [r, stages] = await Promise.all([searchAll(q), listStages()]);
  const total = r.customers.length + r.messages.length + r.deals.length + r.notes.length + r.shipments.length;

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">ผลการค้นหา “{q}”</h1>
        <p className="text-sm text-muted-foreground">{total === 0 ? "ไม่พบผลลัพธ์" : `พบ ${thNumber.format(total)} รายการ`}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section icon={Users} title="ลูกค้า" count={r.customers.length}>
            {r.customers.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="block px-5 py-2.5 hover:bg-accent">
                  <p className="text-sm font-medium">
                    {displayName(c)}
                    {c.chatType !== "user" && <span className="ml-1.5 text-xs font-normal text-sky-700">กลุ่ม</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{[c.company, c.phone && formatPhone(c.phone), c.province].filter(Boolean).join(" · ") || "—"}</p>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={Handshake} title="ดีล" count={r.deals.length}>
            {r.deals.map((d) => (
              <li key={d.id}>
                <Link href={`/customers/${d.customer.id}`} className="block px-5 py-2.5 hover:bg-accent">
                  <p className="text-sm font-medium">
                    {d.title} <span className="text-xs font-normal text-muted-foreground">· {findStage(stages, d.stage).name}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {displayName(d.customer)}
                    {d.quoteNo && ` · ${d.quoteNo}`}
                    {d.items && " · "}
                    {d.items && <Snippet text={d.items} q={q} />}
                  </p>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={PackageCheck} title="เลขพัสดุ" count={r.shipments.length}>
            {r.shipments.map((s) => (
              <li key={s.id}>
                <Link href={`/customers/${s.customer.id}`} className="block px-5 py-2.5 hover:bg-accent">
                  <p className="font-mono text-sm">{s.trackingNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {displayName(s.customer)} · {s.carrier?.name ?? "ไม่ระบุขนส่ง"} · {formatDateTime(s.shippedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={StickyNote} title="โน้ต" count={r.notes.length}>
            {r.notes.map((n) => (
              <li key={n.id}>
                <Link href={`/customers/${n.customer.id}`} className="block px-5 py-2.5 hover:bg-accent">
                  <p className="text-sm">
                    <Snippet text={n.body} q={q} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayName(n.customer)} · {formatDateTime(n.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </Section>
        </div>
        <Section icon={MessageSquare} title={r.messages.length >= 50 ? "ข้อความในแชท (50 ล่าสุด)" : "ข้อความในแชท"} count={r.messages.length}>
          {r.messages.map((m) => (
            <li key={m.id}>
              <Link href={chatHref(m.customer)} className="block px-5 py-2.5 hover:bg-accent">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{displayName(m.customer)}</span>
                  <span>
                    {m.direction === "OUTBOUND" ? `ร้าน${m.sentBy ? ` (${m.sentBy.name})` : ""}` : (m.senderName ?? "ลูกค้า")}
                  </span>
                  <span className="ml-auto shrink-0">{formatDateTime(m.sentAt)}</span>
                </p>
                <p className="mt-0.5 text-sm break-words">
                  <Snippet text={m.text ?? ""} q={q} />
                </p>
              </Link>
            </li>
          ))}
        </Section>
      </div>
      {total === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" /> ลองคำอื่น เช่น รุ่นสินค้า ชื่อบริษัท หรือเลขท้ายเบอร์โทร
        </p>
      )}
    </>
  );
}
