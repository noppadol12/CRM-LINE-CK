"use client";

import { useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { retryWebhookEvents } from "@/actions/line";
import { Button } from "@/components/ui/button";

export function RetryWebhooksButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryWebhookEvents();
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      ประมวลผล {count} event ที่ค้างอีกครั้ง
    </Button>
  );
}
