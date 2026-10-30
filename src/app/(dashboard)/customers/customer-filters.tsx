"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TagOption = { id: string; name: string; color: string };

const STATUSES = [
  { value: "", label: "ทั้งหมด" },
  { value: "following", label: "เพื่อน LINE" },
  { value: "unfollowed", label: "บล็อก" },
  { value: "manual", label: "เพิ่มเอง" },
];

export function CustomerFilters({ tags, canSeeTrash }: { tags: TagOption[]; canSeeTrash: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const trash = params.get("view") === "trash";

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // เปลี่ยนตัวกรอง → กลับหน้าแรก
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // ค้นหาอัตโนมัติหลังหยุดพิมพ์ 350ms
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q.trim()) update({ q: q.trim() || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ช่องค้นหาด้านบนเปลี่ยน q ใน URL → ซิงก์กลับมาที่ช่องนี้
  const urlQ = params.get("q") ?? "";
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  const status = params.get("status") ?? "";
  const tag = params.get("tag") ?? "";

  return (
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
      <label className="relative flex min-w-0 flex-1 items-center lg:max-w-xs">
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-3 size-4 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ชื่อ เบอร์โทร บริษัท อีเมล"
          aria-label="ค้นหาลูกค้า"
          className="h-9 w-full rounded-md border border-input bg-card pr-8 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="ล้างคำค้นหา"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={tag}
          onChange={(e) => update({ tag: e.target.value || null })}
          aria-label="กรองตามแท็ก"
          className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <option value="">ทุกแท็ก</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {!trash && (
          <div className="inline-flex rounded-md border bg-muted/60 p-0.5" role="radiogroup" aria-label="สถานะ LINE">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={status === s.value}
                onClick={() => update({ status: s.value || null })}
                className={cn(
                  "h-8 rounded px-3 text-sm whitespace-nowrap transition-colors",
                  status === s.value ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {canSeeTrash && (
        <Button
          variant={trash ? "secondary" : "ghost"}
          size="sm"
          className="lg:ml-auto"
          onClick={() => update({ view: trash ? null : "trash", status: null })}
        >
          <Trash2 />
          {trash ? "กลับไปรายชื่อลูกค้า" : "ถังขยะ"}
        </Button>
      )}
    </div>
  );
}
