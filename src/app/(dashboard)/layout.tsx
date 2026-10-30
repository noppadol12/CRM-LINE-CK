import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PasswordNotice } from "@/components/layout/password-notice";
import { Suspense } from "react";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={null}>
            <PasswordNotice />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
