"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">โหลดข้อมูลไม่สำเร็จ</h2>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งรหัสอ้างอิงด้านล่างกับผู้ดูแลระบบ</p>
      </div>
      {error.digest && <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">รหัสอ้างอิง: {error.digest}</code>}
      <Button variant="outline" onClick={reset}>
        <RotateCcw />
        ลองใหม่
      </Button>
    </Card>
  );
}
