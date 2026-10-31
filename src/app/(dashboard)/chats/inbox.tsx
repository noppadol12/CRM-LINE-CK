import { MessagesSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getThread, listConversations, parseInboxParams } from "@/lib/chats";
import { listTags } from "@/lib/customers";
import { listCustomerDeals, listOwners } from "@/lib/deals";
import { listQuickReplies } from "@/lib/quick-replies";
import { canManage } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { REPLY_WINDOW_MS } from "@/lib/line-send";
import { AutoRefresh } from "./auto-refresh";
import { ChatThread } from "./chat-thread";
import { ConversationList } from "./conversation-list";
import { CustomerPanel } from "./customer-panel";

export async function Inbox({ searchParams }: { searchParams: PageProps<"/chats">["searchParams"] }) {
  const user = await getCurrentUser();
  const params = parseInboxParams(await searchParams);
  const [conversations, thread, tags, deals, owners, quickReplies] = await Promise.all([
    listConversations(params),
    params.selectedId ? getThread(params.selectedId, params.limit) : null,
    params.selectedId ? listTags() : [],
    params.selectedId ? listCustomerDeals(params.selectedId) : [],
    params.selectedId ? listOwners() : [],
    params.selectedId ? listQuickReplies() : [],
  ]);
  const selected = Boolean(thread);

  return (
    <div
      className={cn(
        "grid h-[calc(100svh-6rem)] overflow-hidden rounded-xl border bg-card shadow-xs sm:h-[calc(100svh-7rem)] lg:h-[calc(100svh-8rem)]",
        "lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]",
      )}
    >
      <AutoRefresh intervalMs={5000} />

      {/* รายชื่อห้องแชท — บนมือถือซ่อนเมื่อเปิดห้อง */}
      <aside className={cn("flex min-h-0 flex-col border-r", selected && "hidden lg:flex")}>
        <ConversationList conversations={conversations} selectedId={params.selectedId} />
      </aside>

      {thread ? (
        <>
          <ChatThread
            key={thread.customer.id}
            customer={{
              id: thread.customer.id,
              fullName: thread.customer.fullName,
              lineName: thread.customer.lineName,
              lineUserId: thread.customer.lineUserId,
              pictureUrl: thread.customer.pictureUrl,
              followStatus: thread.customer.followStatus,
              unreadCount: thread.customer.unreadCount,
            }}
            freeReplyUntil={
              thread.customer.lastReplyToken && thread.customer.lastReplyTokenAt
                ? thread.customer.lastReplyTokenAt.getTime() + REPLY_WINDOW_MS
                : null
            }
            messages={thread.messages.map((m) => ({
              id: m.id,
              direction: m.direction,
              type: m.type,
              text: m.text,
              payload: m.payload as Record<string, unknown> | null,
              lineMessageId: m.lineMessageId,
              sentAt: m.sentAt,
              senderName: m.sentBy?.name ?? null,
              hasFile: Boolean(m.driveFileId),
              sentVia: m.sentVia,
            }))}
            hasMore={thread.hasMore}
            limit={params.limit}
            quickReplies={quickReplies}
            canManage={canManage(user)}
          />
          <aside className="hidden min-h-0 overflow-y-auto border-l bg-muted/20 xl:block">
            <CustomerPanel thread={thread} tags={tags} deals={deals} owners={owners} currentUserId={user.id} canManage={canManage(user)} />
          </aside>
        </>
      ) : (
        <div className="hidden flex-col items-center justify-center gap-3 text-center lg:flex xl:col-span-2">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MessagesSquare className="size-7" />
          </span>
          <div>
            <p className="font-medium">เลือกห้องแชทเพื่อเริ่มสนทนา</p>
            <p className="text-sm text-muted-foreground">ข้อความใหม่จาก LINE จะขึ้นอัตโนมัติ</p>
          </div>
        </div>
      )}
    </div>
  );
}
