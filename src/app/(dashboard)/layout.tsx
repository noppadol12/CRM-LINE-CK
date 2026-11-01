import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PasswordNotice } from "@/components/layout/password-notice";
import { ReminderHeartbeat } from "@/components/tasks/reminder-heartbeat";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TasksBadge, UnreadBadge } from "@/components/layout/unread-badge";
import { Suspense } from "react";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6 sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:p-8">
          <Suspense fallback={null}>
            <PasswordNotice />
          </Suspense>
          {children}
        </main>
        <ReminderHeartbeat />
        <BottomNav
          unreadBadge={
            <Suspense>
              <UnreadBadge />
            </Suspense>
          }
          tasksBadge={
            <Suspense>
              <TasksBadge />
            </Suspense>
          }
        />
      </div>
    </div>
  );
}
