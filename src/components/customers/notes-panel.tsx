"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";
import { addNote, deleteNote, toggleNotePin } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Note = { id: string; body: string; isPinned: boolean; createdAt: Date; authorId: string | null; authorName: string };

export function NotesPanel({
  customerId,
  notes,
  currentUserId,
  canManage,
}: {
  customerId: string;
  notes: Note[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!text.trim()) return;
    start(async () => {
      const r = await addNote(customerId, text);
      if (r.ok) setText("");
      else toast.error(r.error);
    });
  }

  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">โน้ตภายใน</CardTitle>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" />
          ลูกค้ามองไม่เห็น
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="บันทึกข้อมูลสำหรับทีม เช่น ชอบให้ส่งของช่วงเช้า, ขอเครดิต 30 วัน…"
            rows={2}
            maxLength={2000}
          />
          <div className="flex items-center justify-end sm:justify-between">
            <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter เพื่อบันทึก</span>
            <Button size="sm" onClick={submit} disabled={pending || !text.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              บันทึกโน้ต
            </Button>
          </div>
        </div>

        {notes.length > 0 && (
          <ul className="space-y-2.5">
            {notes.map((n) => (
              <NoteItem key={n.id} note={n} canDelete={canManage || n.authorId === currentUserId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NoteItem({ note, canDelete }: { note: Note; canDelete: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast.error(r.error);
    });

  return (
    <li
      className={cn(
        "group rounded-lg border px-3.5 py-3 text-sm transition-opacity",
        note.isPinned ? "border-amber-200 bg-amber-50/70" : "bg-muted/30",
        pending && "opacity-50",
      )}
    >
      <p className="whitespace-pre-wrap">{note.body}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {note.isPinned && <Pin className="size-3 text-amber-600" />}
        <span>
          {note.authorName} · {timeAgo(note.createdAt)}
        </span>
        <div className="ml-auto flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => run(() => toggleNotePin(note.id))}
            className="rounded p-1 hover:bg-accent hover:text-foreground"
            aria-label={note.isPinned ? "เลิกปักหมุด" : "ปักหมุด"}
            title={note.isPinned ? "เลิกปักหมุด" : "ปักหมุด"}
          >
            {note.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm("ลบโน้ตนี้?")) run(() => deleteNote(note.id));
              }}
              className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
              aria-label="ลบโน้ต"
              title="ลบโน้ต"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
