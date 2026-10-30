import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TagChip } from "@/components/tag-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";
import { displayName, timeAgo } from "@/lib/format";

export async function RecentChats() {
  await getCurrentUser();

  const rows = await prisma.customer.findMany({
    where: { deletedAt: null, lastMessageAt: { not: null } },
    orderBy: { lastMessageAt: "desc" },
    take: 6,
    select: {
      id: true,
      lineName: true,
      fullName: true,
      pictureUrl: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      unreadCount: true,
      tags: { select: { tag: { select: { name: true, color: true } } }, take: 2 },
    },
  });

  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="flex-row items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <CardTitle>แชทล่าสุด</CardTitle>
          <CardDescription>ลูกค้าที่ทักเข้ามาทาง LINE OA</CardDescription>
        </div>
        <Link href="/chats" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          ดูทั้งหมด <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="px-2">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <MessagesSquare className="size-8 text-muted-foreground/50" />
            ยังไม่มีแชท — เชื่อม LINE Webhook ใน Phase 4
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => {
              const name = displayName(c);
              return (
                <li key={c.id}>
                  <Link href={`/chats?c=${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent">
                    <Avatar className="size-10">
                      {c.pictureUrl && <AvatarImage src={c.pictureUrl} alt="" />}
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{name}</span>
                        {c.tags.map(({ tag }) => (
                          <TagChip key={tag.name} name={tag.name} color={tag.color} className="hidden sm:inline-flex" />
                        ))}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{c.lastMessagePreview}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {c.lastMessageAt && timeAgo(c.lastMessageAt)}
                      </span>
                      {c.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      ) : (
                        <span className="h-5" />
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentChatsSkeleton() {
  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="border-b pb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-44" />
      </CardHeader>
      <CardContent className="space-y-1 px-5 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
