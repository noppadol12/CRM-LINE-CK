import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CustomerNotFound() {
  return (
    <Card className="items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <UserX className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">ไม่พบลูกค้ารายนี้</h2>
        <p className="text-sm text-muted-foreground">ลิงก์อาจไม่ถูกต้อง หรือข้อมูลถูกลบถาวรแล้ว</p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/customers">กลับไปรายชื่อลูกค้า</Link>
      </Button>
    </Card>
  );
}
