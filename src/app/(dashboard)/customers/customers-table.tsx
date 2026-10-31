"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, RotateCcw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomer, restoreCustomer } from "@/actions/customers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { FollowStatusBadge } from "@/components/customers/follow-status";
import { TagChip } from "@/components/tag-chip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerRow } from "@/lib/customers";
import { displayName, formatDate, formatPhone, timeAgo } from "@/lib/format";
import { initials, thNumber } from "@/lib/utils";

type Props = { rows: CustomerRow[]; trash: boolean; canManage: boolean; hasFilter: boolean };

export function CustomersTable({ rows, trash, canManage, hasFilter }: Props) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {trash ? <Trash2 className="size-6" /> : <Users className="size-6" />}
        </span>
        <p className="font-medium">{trash ? "ถังขยะว่าง" : hasFilter ? "ไม่พบลูกค้าที่ตรงกับเงื่อนไข" : "ยังไม่มีลูกค้า"}</p>
        <p className="text-sm text-muted-foreground">
          {trash ? "ลูกค้าที่ลบจะอยู่ที่นี่ และกู้คืนได้ตลอด" : hasFilter ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "ลูกค้าที่ทักมาทาง LINE OA จะถูกเพิ่มอัตโนมัติ หรือกด “เพิ่มลูกค้า”"}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">ลูกค้า</TableHead>
          <TableHead className="hidden md:table-cell">เบอร์โทร</TableHead>
          <TableHead className="hidden lg:table-cell">แท็ก</TableHead>
          <TableHead className="hidden text-right sm:table-cell">ดีลเปิด</TableHead>
          <TableHead className="hidden xl:table-cell">สถานะ LINE</TableHead>
          <TableHead className="hidden md:table-cell">{trash ? "ลบเมื่อ" : "ติดต่อล่าสุด"}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => {
          const name = displayName(c);
          const href = `/customers/${c.id}`;
          return (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={(e) => {
                // event จาก dialog (portal) ก็วิ่งผ่านแถวนี้ → สนใจเฉพาะคลิกที่อยู่ในแถวจริง
                if (!e.currentTarget.contains(e.target as Node)) return;
                if ((e.target as HTMLElement).closest("button, a, [role=menuitem]")) return;
                if (!trash) router.push(href);
              }}
            >
              {/* w-full + max-w-0 ให้ชื่อยาวตัดด้วย … แทนการดันคอลัมน์อื่นล้นจอ */}
              <TableCell className="w-full max-w-0 pl-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    {c.pictureUrl && <AvatarImage src={c.pictureUrl} alt="" />}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={href} className="truncate font-medium hover:underline">
                        {name}
                      </Link>
                      {c.unreadCount > 0 && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" title="มีข้อความรอตอบ" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[c.fullName && c.lineName ? `LINE: ${c.lineName}` : null, c.company].filter(Boolean).join(" · ") ||
                        (c.phone ? <span className="md:hidden">{formatPhone(c.phone)}</span> : "—")}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap tabular-nums md:table-cell">
                {c.phone ? formatPhone(c.phone) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex max-w-64 flex-wrap gap-1">
                  {c.tags.length === 0 && <span className="text-muted-foreground">—</span>}
                  {c.tags.slice(0, 3).map(({ tag }) => (
                    <TagChip key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                  {c.tags.length > 3 && <span className="text-xs text-muted-foreground">+{c.tags.length - 3}</span>}
                </div>
              </TableCell>
              <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">
                {c._count.deals > 0 ? thNumber.format(c._count.deals) : <span className="font-normal text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <FollowStatusBadge status={c.lineUserId ? c.followStatus : "UNKNOWN"} chatType={c.chatType} />
              </TableCell>
              <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground md:table-cell">
                {trash && c.deletedAt
                  ? formatDate(c.deletedAt)
                  : c.lastMessageAt
                    ? timeAgo(c.lastMessageAt)
                    : "—"}
              </TableCell>
              <TableCell className="pr-3">
                {trash ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const r = await restoreCustomer(c.id);
                      if (r.ok) toast.success(r.message);
                      else toast.error(r.error);
                    }}
                  >
                    <RotateCcw />
                    กู้คืน
                  </Button>
                ) : (
                  <RowMenu row={c} canManage={canManage} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RowMenu({ row, canManage }: { row: CustomerRow; canManage: boolean }) {
  const name = displayName(row);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`เมนูของ ${name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/customers/${row.id}`}>
              <Eye />
              ดูรายละเอียด
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            แก้ไข
          </DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 />
                ลบ
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* dialog อยู่นอกเมนู เพื่อไม่ให้ปิดตามเมนู */}
      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={{ ...row, hasLine: Boolean(row.lineUserId) }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`ลบ ${name}?`}
        description="ลูกค้าจะถูกย้ายไปถังขยะ ประวัติแชทและดีลยังเก็บไว้ครบ และกู้คืนได้ภายหลัง"
        confirmLabel="ย้ายไปถังขยะ"
        onConfirm={async () => {
          const r = await deleteCustomer(row.id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        }}
      />
    </div>
  );
}
