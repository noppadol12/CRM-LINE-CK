import Link from "next/link";
import { Building2, Phone } from "lucide-react";
import { NotesPanel } from "@/components/customers/notes-panel";
import { TagEditor } from "@/components/customers/tag-editor";
import { FollowStatusBadge } from "@/components/customers/follow-status";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Thread } from "@/lib/chats";
import type { TagWithCount } from "@/lib/customers";
import { displayName, formatPhone } from "@/lib/format";
import { initials } from "@/lib/utils";
import { CustomerDeals } from "@/components/deals/customer-deals";
import { WithStages } from "@/components/deals/with-stages";
import type { Owner } from "@/components/deals/deal-form-dialog";
import type { DealDTO } from "@/lib/deals";

export function CustomerPanel({
  thread,
  tags,
  deals,
  owners,
  currentUserId,
  canManage,
}: {
  thread: Thread;
  deals: DealDTO[];
  owners: Owner[];
  tags: TagWithCount[];
  currentUserId: string;
  canManage: boolean;
}) {
  const c = thread.customer;
  const name = displayName(c);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Avatar className="size-16">
          {c.pictureUrl && <AvatarImage src={c.pictureUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
        </Avatar>
        <div>
          <Link href={`/customers/${c.id}`} className="font-semibold hover:underline">
            {name}
          </Link>
          <div className="mt-1 flex justify-center">
            <FollowStatusBadge status={c.lineUserId ? c.followStatus : "UNKNOWN"} chatType={c.chatType} />
          </div>
        </div>
      </div>

      <dl className="space-y-2.5 rounded-lg border bg-card p-3 text-sm">
        <div className="flex items-center gap-2.5">
          <Phone className="size-4 text-muted-foreground" />
          <dt className="sr-only">เบอร์โทร</dt>
          <dd className="truncate">
            {c.phone ? (
              <a href={`tel:${c.phone}`} className="text-primary tabular-nums hover:underline">
                {formatPhone(c.phone)}
              </a>
            ) : (
              <span className="text-muted-foreground">ยังไม่มีเบอร์</span>
            )}
          </dd>
        </div>
        {c.company && (
          <div className="flex items-center gap-2.5">
            <Building2 className="size-4 text-muted-foreground" />
            <dt className="sr-only">บริษัท</dt>
            <dd className="truncate">{c.company}</dd>
          </div>
        )}
      </dl>

      <WithStages>
        <CustomerDeals customer={{ id: c.id, name }} deals={deals} owners={owners} canManage={canManage} compact />
      </WithStages>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">แท็ก</p>
        <TagEditor
          customerId={c.id}
          allTags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
          selectedIds={c.tags.map((t) => t.tagId)}
          canManageTags={canManage}
        />
      </div>

      <NotesPanel
        customerId={c.id}
        currentUserId={currentUserId}
        canManage={canManage}
        notes={c.notes.map((n) => ({
          id: n.id,
          body: n.body,
          isPinned: n.isPinned,
          createdAt: n.createdAt,
          authorId: n.authorId,
          authorName: n.author?.name ?? "ระบบ",
        }))}
      />
    </div>
  );
}
