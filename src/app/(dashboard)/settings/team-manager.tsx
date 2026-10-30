"use client";

import { useState, useTransition, type FormEvent } from "react";
import { KeyRound, Loader2, MoreHorizontal, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { createMember, resetMemberPassword, setMemberActive, updateMember } from "@/actions/team";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, initials } from "@/lib/utils";

type Role = "OWNER" | "ADMIN" | "SALES";
export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  manageable: boolean;
  isSelf: boolean;
};

const ROLE_LABEL: Record<Role, string> = { OWNER: "เจ้าของ", ADMIN: "แอดมิน", SALES: "เซลส์" };
const ROLE_HINT: Record<Role, string> = {
  OWNER: "ทำได้ทุกอย่าง รวมถึงจัดการทีมและล้างข้อมูล",
  ADMIN: "ลบลูกค้า จัดการแท็ก ข้อความสำเร็จรูป การเชื่อมต่อ และเพิ่มเซลส์",
  SALES: "ดูแลลูกค้า ตอบแชท สร้าง/แก้ดีล (ลบไม่ได้)",
};
const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

function RoleSelect({ value, onChange, roles }: { value: Role; onChange: (r: Role) => void; roles: Role[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="member-role">สิทธิ์</Label>
      <select id="member-role" value={value} onChange={(e) => onChange(e.target.value as Role)} className={selectCls}>
        {roles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{ROLE_HINT[value]}</p>
    </div>
  );
}

function MemberDialog({
  open,
  onOpenChange,
  member,
  roles,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member?: MemberRow;
  roles: Role[];
  onCreated: (p: { password: string; email: string }) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<Role>(member?.role ?? "SALES");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // แก้ไขตัวเอง หรือสิทธิ์เดิมที่เราตั้งให้ไม่ได้ → เลือกสิทธิ์ไม่ได้
  const roleOptions = member && !roles.includes(member.role) ? [member.role] : roles;
  const roleLocked = Boolean(member?.isSelf);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = member ? await updateMember(member.id, { name, role }) : await createMember({ name, email, role });
      if (!r.ok) return setError(r.error);
      toast.success(r.message);
      onOpenChange(false);
      if (!member && r.data) onCreated(r.data as { password: string; email: string });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{member ? "แก้ไขทีมงาน" : "เพิ่มทีมงาน"}</DialogTitle>
            {!member && <DialogDescription>ระบบจะสร้างรหัสผ่านชั่วคราวให้ ผู้ใช้ต้องเปลี่ยนรหัสหลังล็อกอินครั้งแรก</DialogDescription>}
          </DialogHeader>
          {error && <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="member-name">ชื่อที่แสดง</Label>
            <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-email">อีเมล (ใช้ล็อกอิน)</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={Boolean(member)}
              autoComplete="off"
            />
          </div>
          {roleLocked ? (
            <p className="text-sm text-muted-foreground">สิทธิ์: {ROLE_LABEL[role]} (เปลี่ยนสิทธิ์ของตัวเองไม่ได้)</p>
          ) : (
            <RoleSelect value={role} onChange={setRole} roles={roleOptions} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {member ? "บันทึก" : "เพิ่มทีมงาน"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordReveal({ value, onClose }: { value: { password: string; email: string } | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(value)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>รหัสผ่านชั่วคราว</DialogTitle>
          <DialogDescription>ส่งให้ทีมงานทางช่องทางส่วนตัว รหัสนี้แสดงครั้งเดียว ปิดหน้าต่างแล้วจะดูอีกไม่ได้</DialogDescription>
        </DialogHeader>
        {value && (
          <dl className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">อีเมล</dt>
              <dd className="flex items-center gap-1 font-medium break-all">
                {value.email} <CopyButton value={value.email} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">รหัสผ่าน</dt>
              <dd className="flex items-center gap-1 font-mono text-lg tracking-wider">
                {value.password} <CopyButton value={value.password} />
              </dd>
            </div>
          </dl>
        )}
        <DialogFooter>
          <Button onClick={onClose}>เรียบร้อย</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManager({ members, assignableRoles }: { members: MemberRow[]; assignableRoles: Role[] }) {
  const [dialog, setDialog] = useState<{ member?: MemberRow } | null>(null);
  const [confirm, setConfirm] = useState<{ type: "reset" | "toggle"; member: MemberRow } | null>(null);
  const [revealed, setRevealed] = useState<{ password: string; email: string } | null>(null);
  const canAdd = assignableRoles.length > 0;

  return (
    <div>
      {canAdd && (
        <div className="border-b px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => setDialog({})}>
            <Plus />
            เพิ่มทีมงาน
          </Button>
        </div>
      )}
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.id} className={cn("flex items-center gap-3 px-5 py-3", !m.isActive && "opacity-60")}>
            <Avatar className="size-9">
              <AvatarFallback>{initials(m.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                <span className="truncate">{m.name}</span>
                {m.isSelf && <span className="text-xs font-normal text-muted-foreground">(คุณ)</span>}
                <Badge variant={m.role === "SALES" ? "secondary" : "soft"}>{ROLE_LABEL[m.role]}</Badge>
                {!m.isActive && <Badge variant="outline">ปิดใช้งาน</Badge>}
                {m.isActive && m.mustChangePassword && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    รอเปลี่ยนรหัส
                  </Badge>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {m.email} · {m.lastLogin ? `เข้าใช้ล่าสุด ${m.lastLogin}` : "ยังไม่เคยเข้าใช้"}
              </p>
            </div>
            {m.manageable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`จัดการ ${m.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDialog({ member: m })}>
                    <Pencil /> แก้ไขชื่อ/สิทธิ์
                  </DropdownMenuItem>
                  {!m.isSelf && (
                    <>
                      <DropdownMenuItem onSelect={() => setConfirm({ type: "reset", member: m })}>
                        <KeyRound /> รีเซ็ตรหัสผ่าน
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setConfirm({ type: "toggle", member: m })}
                        className={m.isActive ? "text-destructive focus:text-destructive" : undefined}
                      >
                        {m.isActive ? <UserX /> : <UserCheck />}
                        {m.isActive ? "ปิดใช้งานบัญชี" : "เปิดใช้งานบัญชี"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      {dialog && (
        <MemberDialog
          key={dialog.member?.id ?? "new"}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          member={dialog.member}
          roles={assignableRoles}
          onCreated={setRevealed}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        destructive={confirm?.type === "toggle" && confirm.member.isActive}
        title={
          confirm?.type === "reset"
            ? `รีเซ็ตรหัสผ่านของ ${confirm.member.name}?`
            : confirm?.member.isActive
              ? `ปิดใช้งานบัญชี ${confirm.member.name}?`
              : `เปิดใช้งานบัญชี ${confirm?.member.name ?? ""}?`
        }
        description={
          confirm?.type === "reset"
            ? "รหัสเดิมใช้ไม่ได้ทันที และผู้ใช้จะถูกออกจากระบบทุกเครื่อง ระบบจะแสดงรหัสชั่วคราวใหม่ให้"
            : confirm?.member.isActive
              ? "ผู้ใช้จะถูกออกจากระบบทันทีและล็อกอินไม่ได้ ข้อมูลลูกค้า ดีล และประวัติแชทที่เคยทำยังอยู่ครบ"
              : "ผู้ใช้จะล็อกอินด้วยรหัสผ่านเดิมได้อีกครั้ง"
        }
        confirmLabel={confirm?.type === "reset" ? "รีเซ็ตรหัสผ่าน" : confirm?.member.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
        onConfirm={async () => {
          if (!confirm) return;
          const { member, type } = confirm;
          if (type === "reset") {
            const r = await resetMemberPassword(member.id);
            if (!r.ok) return toast.error(r.error);
            setConfirm(null);
            setRevealed(r.data ?? null);
          } else {
            const r = await setMemberActive(member.id, !member.isActive);
            if (!r.ok) return toast.error(r.error);
            toast.success(r.message);
            setConfirm(null);
          }
        }}
      />

      <PasswordReveal value={revealed} onClose={() => setRevealed(null)} />
    </div>
  );
}
