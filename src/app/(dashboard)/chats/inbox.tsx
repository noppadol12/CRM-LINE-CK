import { MessagesSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getThread, listConversations, parseInboxParams } from "@/lib/chats";
import { listTags } from "@/lib/customers";
import { listCustomerDeals, listOwners } from "@/lib/deals";
import { listQuickReplies } from "@/lib/quick-replies";
import { canManage } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { REPLY_WINDOW_MS } from "@/lib/line-send";
import { customerShipments, toShipmentDTO } from "@/lib/shipping";
import { listTasks, toTaskDTO } from "@/lib/tasks";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "./auto-refresh";
import { ChatThread } from "./chat-thread";
import { ConversationList } from "./conversation-list";
import { CustomerPanel } from "./customer-panel";

export async function Inbox({ searchParams }: { searchParams: PageProps<"/chats">["searchParams"] }) {
  const user = await getCurrentUser();
  const params = parseInboxParams(await searchParams);
  const [conversations, thread, tags, deals, owners, quickReplies, shipments, tasks] = await Promise.all([
    listConversations({ ...params, userId: user.id }),
    params.selectedId ? getThread(params.selectedId, params.limit) : null,
    listTags(),
    params.selectedId ? listCustomerDeals(params.selectedId) : [],
    params.selectedId ? listOwners() : [],
    params.selectedId ? listQuickReplies() : [],
    params.selectedId ? customerShipments(params.selectedId, 3) : [],
    params.selectedId ? listTasks({ customerId: params.selectedId, take: 5 }).then((r) => r.open) : [],
  ]);
  const isFavorite = params.selectedId
    ? Boolean(await prisma.favoriteCustomer.findUnique({ where: { userId_customerId: { userId: user.id, customerId: params.selectedId } }, select: { userId: true } }))
    : false;
  const selected = Boolean(thread);

  return (
    <div
      data-fullbleed
      className={cn(
        // มือถือ: รายชื่อแชทเลื่อนไปกับหน้า · จอใหญ่: สูงพอดีจอ แบ่งคอลัมน์
        "-mx-4 -mt-4 grid border-b bg-card sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-xl sm:border sm:shadow-xs lg:h-[calc(100svh-6rem)]",
        // จอกว้าง: ใช้เต็มจอ คอลัมน์ข้างกว้างขึ้นตามจอ ช่องแชทได้พื้นที่ที่เหลือทั้งหมด
        "lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_340px] min-[1920px]:grid-cols-[380px_minmax(0,1fr)_380px]",
      )}
    >
      <AutoRefresh intervalMs={5000} />

      {/* รายชื่อห้องแชท — บนมือถือซ่อนเมื่อเปิดห้อง */}
      <aside className={cn("flex min-h-0 flex-col border-r", selected && "hidden lg:flex")}>
        <ConversationList
          conversations={conversations}
          selectedId={params.selectedId}
          tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.customers }))}
        />
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
              chatType: thread.customer.chatType,
              pictureUrl: thread.customer.pictureUrl,
              followStatus: thread.customer.followStatus,
              unreadCount: thread.customer.unreadCount,
              favorite: isFavorite,
              paymentTerm: thread.customer.paymentTerm,
              creditDays: thread.customer.creditDays,
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
              fromName: m.senderName,
              fromPicture: m.senderPictureUrl,
              sentVia: m.sentVia,
            }))}
            hasMore={thread.hasMore}
            limit={params.limit}
            quickReplies={quickReplies}
            canManage={canManage(user)}
            info={<CustomerPanel tasks={tasks.map(toTaskDTO)} shipments={shipments.map(toShipmentDTO)} thread={thread} tags={tags} deals={deals} owners={owners} currentUserId={user.id} canManage={canManage(user)} />}
          />
          <aside className="hidden min-h-0 overflow-y-auto border-l bg-muted/20 2xl:block">
            <CustomerPanel tasks={tasks.map(toTaskDTO)} shipments={shipments.map(toShipmentDTO)} thread={thread} tags={tags} deals={deals} owners={owners} currentUserId={user.id} canManage={canManage(user)} />
          </aside>
        </>
      ) : (
        <div className="hidden flex-col items-center justify-center gap-3 text-center lg:flex 2xl:col-span-2">
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
