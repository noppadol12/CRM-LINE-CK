"use client";

import { Fragment, useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Ban, Loader2, SendHorizontal, UserRound } from "lucide-react";
import { toast } from "sonner";
import { markConversationRead, sendChatMessage } from "@/actions/chats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { MessageBubble, type BubbleMessage } from "./message-bubble";

type ThreadCustomer = {
  id: string;
  fullName: string | null;
  lineName: string | null;
  lineUserId: string | null;
  pictureUrl: string | null;
  followStatus: "FOLLOWING" | "UNFOLLOWED" | "UNKNOWN";
  unreadCount: number;
};

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
const dayLabelFmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", year: "numeric" });

function dayLabel(d: Date, today: string, yesterday: string) {
  const k = dayKey.format(d);
  if (k === today) return "วันนี้";
  if (k === yesterday) return "เมื่อวาน";
  return dayLabelFmt.format(d);
}

export function ChatThread({
  customer,
  messages,
  hasMore,
  limit,
}: {
  customer: ThreadCustomer;
  messages: BubbleMessage[];
  hasMore: boolean;
  limit: number;
}) {
  const params = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const [text, setText] = useState("");
  const [sending, start] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(messages, (state, m: BubbleMessage) => [...state, m]);
  const [days] = useState(() => {
    const now = Date.now();
    return { today: dayKey.format(now), yesterday: dayKey.format(now - 86_400_000) };
  });

  const name = displayName(customer);
  const blocked = customer.followStatus === "UNFOLLOWED";
  const canSend = Boolean(customer.lineUserId) && !blocked;

  const backHref = (() => {
    const next = new URLSearchParams(params.toString());
    next.delete("c");
    next.delete("n");
    const qs = next.toString();
    return qs ? `/chats?${qs}` : "/chats";
  })();
  const olderHref = (() => {
    const next = new URLSearchParams(params.toString());
    next.set("n", String(limit + 50));
    return `/chats?${next.toString()}`;
  })();

  // เปิดห้อง / มีข้อความใหม่ระหว่างเปิดอยู่ → ถือว่าอ่านแล้ว
  useEffect(() => {
    if (customer.unreadCount > 0) void markConversationRead(customer.id);
  }, [customer.id, customer.unreadCount]);

  // เลื่อนลงล่างสุดตอนเปิด และเมื่อมีข้อความใหม่ (ถ้าผู้ใช้ไม่ได้เลื่อนขึ้นไปอ่านข้อความเก่าอยู่)
  const lastId = optimistic.at(-1)?.id;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  function send() {
    const body = text.trim();
    if (!body || !canSend) return;
    setText("");
    nearBottom.current = true;
    start(async () => {
      addOptimistic({
        id: `tmp-${Date.now()}`,
        direction: "OUTBOUND",
        type: "TEXT",
        text: body,
        payload: null,
        lineMessageId: null,
        sentAt: new Date(),
        senderName: null,
        pending: true,
      });
      const r = await sendChatMessage(customer.id, body);
      if (!r.ok) {
        toast.error(r.error);
        setText(body); // คืนข้อความให้แก้แล้วส่งใหม่ได้
      }
      textRef.current?.focus();
    });
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      {/* ===== หัวห้อง ===== */}
      <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="icon-sm" asChild className="lg:hidden">
          <Link href={backHref} aria-label="กลับไปรายชื่อแชท">
            <ArrowLeft />
          </Link>
        </Button>
        <Avatar className="size-9">
          {customer.pictureUrl && <AvatarImage src={customer.pictureUrl} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {blocked ? "บล็อก OA แล้ว" : customer.fullName && customer.lineName ? `LINE: ${customer.lineName}` : "ลูกค้า LINE"}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/customers/${customer.id}`}>
            <UserRound />
            <span className="hidden sm:inline">โปรไฟล์</span>
          </Link>
        </Button>
      </header>

      {/* ===== ข้อความ ===== */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-5"
      >
        {hasMore && (
          <div className="text-center">
            <Link href={olderHref} scroll={false} replace className="text-xs text-primary hover:underline">
              ดูข้อความก่อนหน้า
            </Link>
          </div>
        )}
        {optimistic.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อความ</p>}
        {optimistic.map((m, i) => {
          const label = dayLabel(m.sentAt, days.today, days.yesterday);
          const prev = optimistic[i - 1];
          const showDay = !prev || dayLabel(prev.sentAt, days.today, days.yesterday) !== label;
          return (
            <Fragment key={m.id}>
              {showDay && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-card px-3 py-0.5 text-[11px] text-muted-foreground shadow-xs">{label}</span>
                </div>
              )}
              <MessageBubble m={m} />
            </Fragment>
          );
        })}
      </div>

      {/* ===== ช่องพิมพ์ ===== */}
      <footer className="border-t bg-card p-3">
        {canSend ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={5000}
              placeholder="พิมพ์ข้อความถึงลูกค้า…"
              aria-label="ข้อความ"
              className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
            <Button type="submit" size="icon" className="size-10 rounded-lg" disabled={!text.trim() || sending} aria-label="ส่ง">
              {sending ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
            </Button>
          </form>
        ) : (
          <p className={cn("flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground")}>
            <Ban className="size-4" />
            {blocked ? "ลูกค้าบล็อก OA แล้ว ส่งข้อความไม่ได้" : "ลูกค้ารายนี้ไม่มีบัญชี LINE"}
          </p>
        )}
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่ · นับโควตาข้อความของ OA</p>
      </footer>
    </section>
  );
}
