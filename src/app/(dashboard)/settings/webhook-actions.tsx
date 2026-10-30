"use client";

import { useTransition } from "react";
import { Loader2, PlugZap, Send } from "lucide-react";
import { toast } from "sonner";
import { setupLineWebhook, testLineWebhook } from "@/actions/line";
import { Button } from "@/components/ui/button";

export function WebhookActions({ url, configured }: { url: string; configured: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: () => ReturnType<typeof testLineWebhook>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.error, { duration: 10000 });
    });

  return (
    <div className="flex flex-wrap gap-2">
      {!configured && (
        <Button onClick={() => run(() => setupLineWebhook(url))} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <PlugZap />}
          ตั้ง Webhook URL ให้อัตโนมัติ
        </Button>
      )}
      <Button variant="outline" onClick={() => run(() => testLineWebhook())} disabled={pending}>
        {pending && configured ? <Loader2 className="animate-spin" /> : <Send />}
        ทดสอบการเชื่อมต่อ
      </Button>
    </div>
  );
}
