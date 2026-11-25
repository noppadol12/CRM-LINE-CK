"use client";

import { useEffect, useTransition } from "react";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LABEL_LAYOUTS, type LabelLayout } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function PrintToolbar({ layout, count, sheets }: { layout: LabelLayout; count: number; sheets: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  // จอแคบ (มือถือ): ย่อแผ่นตัวอย่างให้พอดีจอ — ตอนพิมพ์กลับเป็นขนาดจริง
  useEffect(() => {
    const fit = () => document.documentElement.style.setProperty("--sheet-zoom", String(Math.min(1, (Math.min(window.innerWidth, window.screen.width) - 24) / 794)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const setLayout = (v: LabelLayout) => {
    const next = new URLSearchParams(params.toString());
    next.set("layout", v);
    start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  return (
    <div className="no-print sticky top-0 z-10 mb-6 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => (history.length > 1 ? history.back() : window.close())}>
          <ArrowLeft /> กลับ
        </Button>
        <div className="min-w-0 flex-1 max-sm:order-first max-sm:basis-full">
          <p className="text-sm font-medium">
            ใบปะหน้าพัสดุ · {count} ใบ ({sheets} แผ่น A4)
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">ตั้งค่าเครื่องพิมพ์: กระดาษ A4 · ขนาด 100% (ไม่ย่อ) · ปิดหัว/ท้ายกระดาษ</p>
        </div>
        <div role="radiogroup" aria-label="รูปแบบ" className="grid flex-1 grid-cols-2 rounded-md bg-muted p-0.5 text-sm sm:flex-none">
          {LABEL_LAYOUTS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={layout === o.value}
              onClick={() => setLayout(o.value)}
              title={o.hint}
              className={cn(
                "rounded px-3 py-1.5 transition-colors",
                layout === o.value ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{o.value === "4" ? "4 ช่อง" : "A5 · 2 ใบ"}</span>
              <span className="hidden sm:inline">{o.label}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => window.print()} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Printer />} พิมพ์
        </Button>
      </div>
    </div>
  );
}
