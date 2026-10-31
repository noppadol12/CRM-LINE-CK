import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { getCurrentUser } from "@/lib/auth";
import { endOfTodayBangkok, listTasks, toTaskDTO } from "@/lib/tasks";

export async function TasksToday() {
  const user = await getCurrentUser();
  const { open } = await listTasks({ assigneeId: user.id, take: 50 });
  const due = open.filter((t) => t.dueAt <= endOfTodayBangkok());
  return (
    <Card className="gap-0 pb-1">
      <CardHeader className="flex-row items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <CardTitle>งานของฉันวันนี้</CardTitle>
          <CardDescription>{due.length ? `${due.length} งาน (รวมที่เลยกำหนด)` : "ไม่มีงานค้างวันนี้"}</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <TaskDialog
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="เพิ่มงาน">
                <Plus />
              </Button>
            }
          />
          <Link href="/tasks" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            ทั้งหมด <ArrowRight className="size-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <TaskList tasks={due.slice(0, 8).map(toTaskDTO)} empty="ว่าง 🎉 เพิ่มงานติดตามได้จากห้องแชทหรือหน้าลูกค้า" />
      </CardContent>
    </Card>
  );
}
