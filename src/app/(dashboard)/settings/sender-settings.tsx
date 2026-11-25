"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveSender } from "@/actions/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Sender } from "@/lib/labels";

export function SenderSettings({ sender, canEdit }: { sender: Sender; canEdit: boolean }) {
  const [name, setName] = useState(sender.name);
  const [phone, setPhone] = useState(sender.phone);
  const [address, setAddress] = useState(sender.address);
  const [pending, start] = useTransition();
  const dirty = name !== sender.name || phone !== sender.phone || address !== sender.address;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSender({ name, phone, address });
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="snd-name">ชื่อผู้ส่ง</Label>
          <Input id="snd-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="snd-phone">เบอร์โทร</Label>
          <Input id="snd-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} maxLength={60} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="snd-address">ที่อยู่</Label>
          <Textarea id="snd-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit} maxLength={400} />
        </div>
      </div>
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!dirty || pending}>
            {pending && <Loader2 className="animate-spin" />}
            บันทึก
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">แก้ไขได้เฉพาะเจ้าของหรือแอดมิน</p>
      )}
    </form>
  );
}
