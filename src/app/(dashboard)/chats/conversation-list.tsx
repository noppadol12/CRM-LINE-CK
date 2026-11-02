"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ban, Loader2, Search, Tag, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Conversation } from "@/lib/chats";
import { displayName, timeAgo } from "@/lib/format";
import { tagColor } from "@/lib/tag-colors";
import { cn, initials } from "@/lib/utils";
import { TagPicker, type TagOption } from "./tag-picker";

/** จำนวนชิปแท็กที่แสดงในแถว — ที่เหลือเลือกจากรายการ */
const MAX_CHIPS = 6;

export function ConversationList({
  conversations,
  selectedId,
  tags,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  tags: TagOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const filter = params.get("f") === "unread" ? "unread" : "all";
  const picked = (params.get("t") ?? "").split(",").filter(Boolean);
  /** เลือก/เลิกเลือกแท็ก (เลือกได้หลายแท็ก = ห้องที่มีแท็กใดแท็กหนึ่ง) */
  const tagHref = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    return hrefWith({ t: next.join(",") || null, c: null, n: null });
  };

  // ชิปที่โชว์: แท็กที่เลือกไว้ก่อน แล้วตามด้วยแท็กที่มีลูกค้ามากสุด
  const chipTags = [...tags]
    .sort((a, b) => Number(picked.includes(b.id)) - Number(picked.includes(a.id)) || b.count - a.count || a.name.localeCompare(b.name, "th"))
    .slice(0, Math.max(MAX_CHIPS, picked.length));
  const hiddenCount = tags.length - chipTags.length;

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
        {tags.length > 0 && (
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5" aria-label="กรองตามแท็ก">
            <span className="flex shrink-0 items-center text-muted-foreground" title="กรองตามแท็ก">
              <Tag className="size-3.5" />
            </span>
            {picked.length > 0 && (
              <Link
                href={hrefWith({ t: null, c: null, n: null })}
                replace
                scroll={false}
                className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                <X className="size-3" /> ล้าง
              </Link>
            )}
            {chipTags.map((t) => {
              const on = picked.includes(t.id);
              return (
                <Link
                  key={t.id}
                  href={tagHref(t.id)}
                  replace
                  scroll={false}
                  aria-pressed={on}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on ? "border-primary bg-primary-soft font-medium text-primary" : "hover:bg-accent",
                  )}
                >
                  <span className={cn("size-2 rounded-full", tagColor(t.color).dot)} />
                  {t.name}
                  <span className={on ? "text-primary/70" : "text-muted-foreground"}>{t.count}</span>
                </Link>
              );
            })}
            {tags.length > MAX_CHIPS && (
              <TagPicker
                tags={tags}
                picked={picked}
                hidden={hiddenCount}
                onApply={(ids) => start(() => router.replace(hrefWith({ t: ids.join(",") || null, c: null, n: null }), { scroll: false }))}
              />
            )}
          </div>
        )}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {conversations.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            {picked.length ? "ไม่มีห้องแชทที่ติดแท็กนี้" : filter === "unread" ? "ตอบครบทุกห้องแล้ว 🎉" : q ? "ไม่พบห้องแชท" : "ยังไม่มีแชท"}
          </li>
        )}
        {conversations.map((c) => {
          const name = displayName(c);
          const active = c.id === selectedId;
          const rowTags = c.tags.map((x) => x.tag);
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
                  {c.followStatus === "UNFOLLOWED" ? (
                    <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-card p-0.5" title={c.chatType === "user" ? "บล็อก OA แล้ว" : "OA ออกจากกลุ่มแล้ว"}>
                      <Ban className="size-3 text-rose-500" />
                    </span>
                  ) : (
                    c.chatType !== "user" && (
                      <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-card p-0.5" title="แชทกลุ่ม">
                        <Users className="size-3 text-sky-600" />
                      </span>
                    )
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
                    {rowTags.map((t) => (
                      <span key={t.name} className={cn("hidden shrink-0 rounded px-1.5 py-px text-[10px] sm:inline", tagColor(t.color).chip)}>
                        {t.name}
                      </span>
                    ))}
                    {rowTags.map((t) => (
                      <span key={`d-${t.name}`} className={cn("size-1.5 shrink-0 rounded-full sm:hidden", tagColor(t.color).dot)} title={t.name} />
                    ))}
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
