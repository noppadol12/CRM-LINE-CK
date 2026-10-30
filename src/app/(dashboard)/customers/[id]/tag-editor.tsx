"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Check, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { setCustomerTags } from "@/actions/customers";
import { TagChip } from "@/components/tag-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

type TagOption = { id: string; name: string; color: string };

export function TagEditor({
  customerId,
  allTags,
  selectedIds,
  canManageTags,
  readOnly,
}: {
  customerId: string;
  allTags: TagOption[];
  selectedIds: string[];
  canManageTags: boolean;
  readOnly?: boolean;
}) {
  const [, start] = useTransition();
  const [selected, setOptimistic] = useOptimistic(selectedIds);

  function save(next: string[]) {
    start(async () => {
      setOptimistic(next);
      const r = await setCustomerTags(customerId, next);
      if (!r.ok) toast.error(r.error);
    });
  }

  const toggle = (id: string) => save(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const chosen = allTags.filter((t) => selected.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.length === 0 && <span className="text-sm text-muted-foreground">ยังไม่มีแท็ก</span>}
      {chosen.map((t) => (
        <TagChip key={t.id} name={t.name} color={t.color} onRemove={readOnly ? undefined : () => toggle(t.id)} />
      ))}

      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 rounded-full px-2 text-xs">
              <Plus className="size-3" />
              แท็ก
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-muted-foreground">เลือกแท็ก</DropdownMenuLabel>
            {allTags.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">ยังไม่มีแท็กในระบบ</p>}
            {allTags.map((t) => {
              const on = selected.includes(t.id);
              return (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={(e) => {
                    e.preventDefault(); // เลือกหลายแท็กได้โดยเมนูไม่ปิด
                    toggle(t.id);
                  }}
                >
                  <span className={cn("size-2 rounded-full", tagColor(t.color).dot)} />
                  <span className="flex-1">{t.name}</span>
                  {on && <Check className="!text-primary" />}
                </DropdownMenuItem>
              );
            })}
            {canManageTags && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings#tags">
                    <Settings2 />
                    จัดการแท็ก
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
