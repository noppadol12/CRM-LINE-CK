import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { getCurrentUser } from "@/lib/auth";
import { endOfTodayBangkok, listTasks, toTaskDTO } from "@/lib/tasks";
import { cn, thNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "งานติดตาม · CK CRM" };

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Tasks searchParams={searchParams} />
    </Suspense>
  );
}

async function Tasks({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const user = await getCurrentUser();
  const all = (await searchParams).who === "all";
  const { open, done } = await listTasks({ assigneeId: all ? undefined : user.id, includeDone: true });
  const now = new Date();
  const eod = endOfTodayBangkok();
  const overdue = open.filter((t) => t.dueAt < now);
  const today = open.filter((t) => t.dueAt >= now && t.dueAt <= eod);
  const later = open.filter((t) => t.dueAt > eod);

  const sections = [
    { key: "overdue", title: "เลยกำหนด", tone: "text-rose-600", rows: overdue },
    { key: "today", title: "วันนี้", tone: "", rows: today },
    { key: "later", title: "ถัดไป", tone: "", rows: later },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">งานติดตาม</h1>
          <p className="text-sm text-muted-foreground">
            ค้าง {thNumber.format(open.length)} งาน · เลยกำหนด {thNumber.format(overdue.length)} · แจ้งเตือนเข้ามือถือเมื่อถึงเวลา
          </p>
        </div>
        <TaskDialog
          trigger={
            <Button>
              <Plus /> เพิ่มงาน
            </Button>
          }
        />
      </div>

      <nav className="inline-flex w-fit rounded-md border bg-muted/60 p-0.5" aria-label="ของใคร">
        {[
          { href: "/tasks", label: "งานของฉัน", on: !all },
          { href: "/tasks?who=all", label: "ทั้งทีม", on: all },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            replace
            scroll={false}
            aria-current={t.on ? "page" : undefined}
            className={cn("h-8 rounded px-3 text-sm leading-8", t.on ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {sections.map((s) => (
            <Card key={s.key} className="gap-0 pb-0">
              <CardHeader className="border-b pb-3">
                <CardTitle className={cn("text-base", s.tone)}>
                  {s.title} <span className="text-sm font-normal text-muted-foreground">({s.rows.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <TaskList tasks={s.rows.map(toTaskDTO)} empty={s.key === "overdue" ? "ไม่มีงานเลยกำหนด 👍" : "ไม่มีงาน"} />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit gap-0 pb-0">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">เสร็จแล้ว (7 วัน)</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <TaskList tasks={done.map(toTaskDTO)} empty="ยังไม่มี" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
