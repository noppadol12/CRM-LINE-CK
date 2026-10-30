"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createTag, deleteTag, updateTag } from "@/actions/tags";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TagChip } from "@/components/tag-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TAG_COLOR_KEYS, TAG_COLORS, type TagColor } from "@/lib/tag-colors";
import { cn, thNumber } from "@/lib/utils";

type Tag = { id: string; name: string; color: string; count: number };

function ColorPicker({ value, onChange }: { value: string; onChange: (c: TagColor) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="สีแท็ก">
      {TAG_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={TAG_COLORS[key].label}
          title={TAG_COLORS[key].label}
          onClick={() => onChange(key)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition",
            TAG_COLORS[key].dot,
            value === key ? "ring-2 ring-foreground/60" : "hover:scale-110",
          )}
        >
          {value === key && <Check className="size-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

export function TagsManager({ tags, canEdit }: { tags: Tag[]; canEdit: boolean }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("sky");
  const [pending, start] = useTransition();

  function create() {
    if (!name.trim()) return;
    start(async () => {
      const r = await createTag({ name, color });
      if (r.ok) {
        toast.success(r.message);
        setName("");
      } else toast.error(r.error);
    });
  }

  return (
    <div>
      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-4"
        >
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อแท็กใหม่ เช่น ลูกค้าส่ง" maxLength={40} />
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              เพิ่ม
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">สี</span>
            <ColorPicker value={color} onChange={setColor} />
            {name.trim() && <TagChip name={name.trim()} color={color} className="ml-auto" />}
          </div>
        </form>
      ) : (
        <p className="border-b px-5 py-3 text-sm text-muted-foreground">เฉพาะเจ้าของและแอดมินที่แก้ไขแท็กได้</p>
      )}

      {tags.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีแท็ก</p>
      ) : (
        <ul className="divide-y">
          {tags.map((t) => (
            <TagRow key={t.id} tag={t} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TagRow({ tag, canEdit }: { tag: Tag; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<string>(tag.color);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updateTag(tag.id, { name, color });
      if (r.ok) {
        toast.success(r.message);
        setEditing(false);
      } else toast.error(r.error);
    });
  }

  if (editing) {
    return (
      <li className="space-y-3 bg-muted/30 px-5 py-3.5">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          <Button size="icon" onClick={save} disabled={pending || !name.trim()} aria-label="บันทึก">
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="ยกเลิก"
            onClick={() => {
              setEditing(false);
              setName(tag.name);
              setColor(tag.color);
            }}
          >
            <X />
          </Button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 px-5 py-3">
      <TagChip name={tag.name} color={tag.color} />
      <Link href={`/customers?tag=${tag.id}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
        {thNumber.format(tag.count)} ราย
      </Link>
      {canEdit && (
        <div className="ml-auto flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={`แก้ไขแท็ก ${tag.name}`}>
            <Pencil />
          </Button>
          <ConfirmDialog
            title={`ลบแท็ก "${tag.name}"?`}
            description={
              tag.count > 0
                ? `แท็กนี้จะถูกเอาออกจากลูกค้า ${thNumber.format(tag.count)} ราย (ข้อมูลลูกค้าไม่หาย)`
                : "แท็กนี้ยังไม่ได้ใช้กับลูกค้ารายใด"
            }
            confirmLabel="ลบแท็ก"
            onConfirm={async () => {
              const r = await deleteTag(tag.id);
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            }}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`ลบแท็ก ${tag.name}`} className="hover:text-destructive">
                <Trash2 />
              </Button>
            }
          />
        </div>
      )}
    </li>
  );
}
