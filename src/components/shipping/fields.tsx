"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { REGIONS } from "@/lib/provinces";
import { cn } from "@/lib/utils";

export const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60";

export function Field({ label, hint, children, className, htmlFor }: { label: string; hint?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** เลือกจังหวัด จัดกลุ่มตามภาค */
export function ProvinceSelect({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="">— ไม่ระบุ —</option>
      {REGIONS.map((r) => (
        <optgroup key={r.key} label={r.name}>
          {r.provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

type CarrierLite = { id: string; name: string; isActive: boolean; coverage: { province: string }[] };

/** เลือกขนส่ง: เจ้าที่ไปจังหวัดของลูกค้าขึ้นก่อน */
export function CarrierSelect({
  id,
  value,
  onChange,
  carriers,
  province,
  placeholder = "— ไม่ระบุ —",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  carriers: CarrierLite[];
  province?: string | null;
  placeholder?: string;
}) {
  const list = carriers.filter((c) => c.isActive || c.id === value);
  const covers = (c: CarrierLite) => Boolean(province && c.coverage.some((x) => x.province === province));
  const matched = list.filter(covers);
  const others = list.filter((c) => !covers(c));
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="">{placeholder}</option>
      {province && matched.length > 0 ? (
        <>
          <optgroup label={`ไป${province}`}>
            {matched.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
          {others.length > 0 && (
            <optgroup label="เจ้าอื่น">
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </>
      ) : (
        list.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))
      )}
    </select>
  );
}
