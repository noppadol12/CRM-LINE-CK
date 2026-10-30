"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ban, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Conversation } from "@/lib/chats";
import { displayName, timeAgo } from "@/lib/format";
import { tagColor } from "@/lib/tag-colors";
import { cn, initials } from "@/lib/utils";

export function ConversationList({ conversations, selectedId }: { conversations: Conversation[]; selectedId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const filter = params.get("f") === "unread" ? "unread" : "all";

  const hrefWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  useEffect(() => {
    if ((params.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => start(() => router.replace(hrefWith({ q: q.trim() || null }), { scroll: false })), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-lg font-semibold">แชท</h1>
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ ข้อความ"
            aria-label="ค้นหาห้องแชท"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </label>
        <div className="grid grid-cols-2 rounded-md bg-muted p-0.5 text-sm" role="tablist">
          {(["all", "unread"] as const).map((f) => (
            <Link
              key={f}
              role="tab"
              aria-selected={filter === f}
              href={hrefWith({ f: f === "all" ? null : f })}
              replace
              scroll={false}
              className={cn(
                "rounded px-3 py-1.5 text-center transition-colors",
                filter === f ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "ทั้งหมด" : "รอตอบ"}
            </Link>
          ))}
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {conversations.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            {filter === "unread" ? "ตอบครบทุกห้องแล้ว 🎉" : q ? "ไม่พบห้องแชท" : "ยังไม่มีแชท"}
          </li>
        )}
        {conversations.map((c) => {
          const name = displayName(c);
          const active = c.id === selectedId;
          const tag = c.tags[0]?.tag;
          return (
            <li key={c.id}>
              <Link
                href={hrefWith({ c: c.id, n: null })}
                scroll={false}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors",
                  active ? "bg-primary-soft" : "hover:bg-accent",
                )}
              >
                <div className="relative">
                  <Avatar className="size-11">
                    {c.pictureUrl && <AvatarImage src={c.pictureUrl} alt="" />}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  {c.followStatus === "UNFOLLOWED" && (
                    <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-card p-0.5" title="บล็อก OA แล้ว">
                      <Ban className="size-3 text-rose-500" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("truncate text-sm", c.unreadCount > 0 ? "font-semibold" : "font-medium")}>{name}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {c.lastMessageAt && timeAgo(c.lastMessageAt).replace("ที่ผ่านมา", "")}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className={cn("min-w-0 flex-1 truncate text-xs", c.unreadCount > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.lastMessagePreview}
                    </p>
                    {tag && <span className={cn("size-1.5 shrink-0 rounded-full", tagColor(tag.color).dot)} title={tag.name} />}
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
