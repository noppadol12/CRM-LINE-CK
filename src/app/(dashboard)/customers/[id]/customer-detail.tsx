import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Handshake,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Phone,
  UserRound,
} from "lucide-react";
import { FollowStatusBadge } from "@/components/customers/follow-status";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getCustomer, listTags } from "@/lib/customers";
import { listCustomerDeals, listOwners } from "@/lib/deals";
import { baht, OPEN_STAGES } from "@/lib/deal-stages";
import { CustomerDeals } from "@/components/deals/customer-deals";
import { displayName, formatDate, formatDateTime, formatPhone, timeAgo } from "@/lib/format";
import { canManage } from "@/lib/permissions";
import { cn, initials, thNumber } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { CustomerActions, RestoreBanner } from "./customer-actions";
import { NotesPanel } from "@/components/customers/notes-panel";
import { TagEditor } from "@/components/customers/tag-editor";


export async function CustomerDetailView({ params }: { params: PageProps<"/customers/[id]">["params"] }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const [c, allTags, deals, owners] = await Promise.all([getCustomer(id), listTags(), listCustomerDeals(id), listOwners()]);
  if (!c) notFound();

  const name = displayName(c);
  const manager = canManage(user);
  const recentMessages = [...c.messages].reverse();

  return (
    <>
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        รายชื่อลูกค้า
      </Link>

      {c.deletedAt && <RestoreBanner id={c.id} canManage={manager} deletedAt={formatDate(c.deletedAt)} />}

      {/* ===== Header ===== */}
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar className="size-16 text-lg">
            {c.pictureUrl && <AvatarImage src={c.pictureUrl} alt="" />}
            <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {c.fullName && c.lineName && (
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="size-3.5" />
                  {c.lineName}
                </span>
              )}
              <FollowStatusBadge status={c.lineUserId ? c.followStatus : "UNKNOWN"} />
              {c.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {c.company}
                </span>
              )}
            </div>
          </div>
          {!c.deletedAt && (
            <CustomerActions
              customer={{
                id: c.id,
                fullName: c.fullName,
                lineName: c.lineName,
                phone: c.phone,
                email: c.email,
                company: c.company,
                address: c.address,
                hasLine: Boolean(c.lineUserId),
              }}
              name={name}
              canManage={manager}
              hasLine={Boolean(c.lineUserId)}
            />
          )}
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <Stat
            icon={Handshake}
            label="ดีลเปิดอยู่"
            value={`${deals.filter((d) => OPEN_STAGES.includes(d.stage)).length} · ${baht.format(
              deals.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((sum, d) => sum + (d.amount ?? 0), 0),
            )}`}
          />
          <Stat icon={MessagesSquare} label="ข้อความทั้งหมด" value={thNumber.format(c._count.messages)} />
          <Stat
            icon={CalendarDays}
            label="ติดต่อล่าสุด"
            value={c.lastMessageAt ? timeAgo(c.lastMessageAt) : "—"}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== ซ้าย: ข้อมูลติดต่อ + แท็ก ===== */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ข้อมูลติดต่อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <InfoRow icon={Phone} label="เบอร์โทร">
                {c.phone ? (
                  <a href={`tel:${c.phone}`} className="text-primary tabular-nums hover:underline">
                    {formatPhone(c.phone)}
                  </a>
                ) : null}
              </InfoRow>
              <InfoRow icon={Mail} label="อีเมล">
                {c.email ? (
                  <a href={`mailto:${c.email}`} className="break-all text-primary hover:underline">
                    {c.email}
                  </a>
                ) : null}
              </InfoRow>
              <InfoRow icon={Building2} label="บริษัท / ร้าน">
                {c.company}
              </InfoRow>
              <InfoRow icon={MapPin} label="ที่อยู่จัดส่ง">
                {c.address ? <span className="whitespace-pre-line">{c.address}</span> : null}
              </InfoRow>
              <InfoRow icon={UserRound} label="ผู้ดูแล">
                {c.assignedTo?.name}
              </InfoRow>
              <div className="space-y-2 border-t pt-3.5 text-xs text-muted-foreground">
                {c.lineUserId && (
                  <div className="flex items-center justify-between gap-2">
                    <span>LINE UID</span>
                    <span className="flex min-w-0 items-center gap-1">
                      <code className="truncate">{c.lineUserId}</code>
                      <CopyButton value={c.lineUserId} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{c.lineUserId ? "เพิ่มเพื่อนเมื่อ" : "เพิ่มในระบบเมื่อ"}</span>
                  <span>{formatDate(c.followedAt ?? c.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">แท็ก</CardTitle>
            </CardHeader>
            <CardContent>
              <TagEditor
                customerId={c.id}
                allTags={allTags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
                selectedIds={c.tags.map((t) => t.tagId)}
                canManageTags={manager}
                readOnly={Boolean(c.deletedAt)}
              />
            </CardContent>
          </Card>
        </div>

        {/* ===== ขวา: ดีล + โน้ต + แชท ===== */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent>
              <CustomerDeals customer={{ id: c.id, name }} deals={deals} owners={owners} canManage={manager} />
            </CardContent>
          </Card>
          <NotesPanel
            customerId={c.id}
            currentUserId={user.id}
            canManage={manager}
            notes={c.notes.map((n) => ({
              id: n.id,
              body: n.body,
              isPinned: n.isPinned,
              createdAt: n.createdAt,
              authorId: n.authorId,
              authorName: n.author?.name ?? "ระบบ",
            }))}
          />

          <Card className="gap-0 pb-0">
            <CardHeader className="flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-base">แชทล่าสุด</CardTitle>
              {c.lineUserId && (
                <Link href={`/chats?c=${c.id}`} className="text-sm font-medium text-primary hover:underline">
                  เปิดห้องแชท
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-2.5 bg-muted/40 p-5">
              {recentMessages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีข้อความ</p>
              ) : (
                recentMessages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "OUTBOUND" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                        m.direction === "OUTBOUND" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.text ?? `[${m.type.toLowerCase()}]`}</p>
                      <p className={cn("mt-1 text-[11px]", m.direction === "OUTBOUND" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDateTime(m.sentAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Handshake; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:px-6">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="truncate text-base font-semibold sm:text-lg">{value}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-28" />
      <Card className="flex-row items-center gap-5 p-6">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      </div>
    </>
  );
}
