"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteQuickReply, moveQuickReply, saveQuickReply } from "@/actions/quick-replies";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Reply = { id: string; title: string; body: string };

function Editor({ initial, onDone }: { initial?: Reply; onDone: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2.5 bg-muted/30 px-5 py-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อปุ่ม เช่น เลขบัญชีโอนเงิน" maxLength={40} autoFocus />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="ข้อความที่จะแทรกลงช่องพิมพ์" maxLength={5000} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          ใส่ <code className="rounded bg-muted px-1">{"{ชื่อลูกค้า}"}</code> เพื่อแทนด้วยชื่อลูกค้าอัตโนมัติ
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDone} disabled={pending}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={() =>
              start(async () => {
                const r = await saveQuickReply(initial?.id ?? null, { title, body });
                if (r.ok) {
                  toast.success(r.message);
                  onDone();
                } else toast.error(r.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuickRepliesManager({ replies, canEdit }: { replies: Reply[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [, start] = useTransition();

  return (
    <div>
      {canEdit && editing !== "new" && (
        <div className="border-b px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus />
            เพิ่มข้อความ
          </Button>
        </div>
      )}
      {editing === "new" && <Editor onDone={() => setEditing(null)} />}

      {replies.length === 0 && editing !== "new" && <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อความสำเร็จรูป</p>}

      <ul className="divide-y">
        {replies.map((r, i) =>
          editing === r.id ? (
            <li key={r.id}>
              <Editor initial={r} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={r.id} className="group flex gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="line-clamp-2 text-xs whitespace-pre-line text-muted-foreground">{r.body}</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-start gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label="เลื่อนขึ้น" onClick={() => start(() => void moveQuickReply(r.id, -1))}>
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === replies.length - 1}
                    aria-label="เลื่อนลง"
                    onClick={() => start(() => void moveQuickReply(r.id, 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`แก้ไข ${r.title}`} onClick={() => setEditing(r.id)}>
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    title={`ลบ "${r.title}"?`}
                    confirmLabel="ลบ"
                    onConfirm={async () => {
                      const res = await deleteQuickReply(r.id);
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.error);
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`ลบ ${r.title}`} className="hover:text-destructive">
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              )}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
