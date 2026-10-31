"use client";

import { Fragment, useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Ban, Loader2, Paperclip, SendHorizontal, UserRound, Zap } from "lucide-react";
import { toast } from "sonner";
import { markConversationRead, sendChatAttachment, sendChatMessage } from "@/actions/chats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { MessageBubble, type BubbleMessage } from "./message-bubble";
import { QuickReplyPicker, type QuickReply } from "./quick-reply-picker";

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

const MAX_UPLOAD = 4 * 1024 * 1024;
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv";

/** ย่อรูปก่อนส่ง: ด้านยาวไม่เกิน 1600px เป็น JPEG ไม่เกิน ~1 MB (LINE กำหนดรูปตัวอย่างไม่เกิน 1 MB) */
async function prepareImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // พื้นหลังขาวสำหรับ PNG โปร่งใส
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.85;
  let blob: Blob | null = null;
  while (quality >= 0.45) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= 1_000_000) break;
    quality -= 0.1;
  }
  if (!blob) throw new Error("แปลงรูปไม่สำเร็จ");
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/** แสดงว่าตอนนี้ตอบได้ฟรี (มี reply token ที่ยังไม่หมดอายุ) พร้อมนับถอยหลัง */
function FreeReplyHint({ until }: { until: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  const left = until ? Math.floor((until - now) / 1000) : 0;
  if (left <= 0)
    return (
      <>
        <span className="hidden sm:inline">Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่ · วางรูปได้ด้วย Ctrl+V · </span>
        ข้อความนับโควตาของ OA
      </>
    );
  return (
    <span className="inline-flex items-center gap-1 font-medium text-primary">
      <Zap className="size-3" />
      ตอบตอนนี้ฟรี ไม่นับโควตา (เหลือ {left} วิ)
    </span>
  );
}

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
  quickReplies,
  canManage,
  freeReplyUntil,
}: {
  customer: ThreadCustomer;
  freeReplyUntil: number | null;
  messages: BubbleMessage[];
  hasMore: boolean;
  limit: number;
  quickReplies: QuickReply[];
  canManage: boolean;
}) {
  const params = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  /** แทรกข้อความสำเร็จรูปตรงตำแหน่งเคอร์เซอร์ */
  function insertText(snippet: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + snippet.length;
      el?.setSelectionRange(pos, pos);
    });
  }

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
      if (r.ok && r.message) toast.success(r.message, { duration: 2500 });
      if (!r.ok) {
        toast.error(r.error);
        setText(body); // คืนข้อความให้แก้แล้วส่งใหม่ได้
      }
      textRef.current?.focus();
    });
  }

  function sendFile(original: File) {
    if (!canSend) return;
    nearBottom.current = true;
    start(async () => {
      let file = original;
      try {
        if (original.type.startsWith("image/")) file = await prepareImage(original);
      } catch {
        toast.error("เปิดรูปนี้ไม่ได้ (รองรับ JPG / PNG / WebP)");
        return;
      }
      if (file.size > MAX_UPLOAD) {
        toast.error("ไฟล์ใหญ่เกิน 4 MB");
        return;
      }
      const isImage = file.type === "image/jpeg" || file.type === "image/png";
      const localUrl = isImage ? URL.createObjectURL(file) : undefined;
      addOptimistic({
        id: `tmp-${Date.now()}`,
        direction: "OUTBOUND",
        type: isImage ? "IMAGE" : "FILE",
        text: isImage ? null : file.name,
        payload: null,
        lineMessageId: null,
        sentAt: new Date(),
        senderName: null,
        pending: true,
        localUrl,
      });
      const fd = new FormData();
      fd.set("customerId", customer.id);
      fd.set("file", file);
      const r = await sendChatAttachment(fd);
      if (r.ok) {
        if (r.message?.includes("ฟรี")) toast.success(r.message);
      } else toast.error(r.error, { duration: 10000 });
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
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) sendFile(f);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-lg text-muted-foreground"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              aria-label="แนบรูปหรือไฟล์"
              title="แนบรูปหรือไฟล์ (ไม่เกิน 4 MB)"
            >
              <Paperclip />
            </Button>
            <QuickReplyPicker
              replies={quickReplies}
              customerName={customer.fullName || customer.lineName || "ลูกค้า"}
              onPick={insertText}
              canManage={canManage}
            />
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
                if (f) {
                  e.preventDefault();
                  sendFile(f);
                }
              }}
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
        {canSend && (
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            <FreeReplyHint key={freeReplyUntil ?? 0} until={freeReplyUntil} />
          </p>
        )}
      </footer>
    </section>
  );
}
