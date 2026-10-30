"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudUpload, Link2, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { disconnectGoogleDrive, syncPendingMedia } from "@/actions/storage";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "เชื่อมต่อ Google Drive สำเร็จ ไฟล์ใหม่จะถูกเก็บอัตโนมัติ" },
  denied: { ok: false, text: "ยกเลิกการอนุญาตในหน้า Google" },
  forbidden: { ok: false, text: "เฉพาะเจ้าของและแอดมินที่เชื่อมต่อได้" },
  config: { ok: false, text: "ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
  error: { ok: false, text: "เชื่อมต่อไม่สำเร็จ" },
};

/** แสดงผลลัพธ์หลัง Google ส่งกลับมา (?drive=...) แล้วล้างพารามิเตอร์ออกจาก URL */
export function DriveResultToast() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("drive");
  const msg = params.get("msg");

  useEffect(() => {
    if (!status) return;
    const r = RESULT[status] ?? RESULT.error;
    if (r.ok) toast.success(r.text);
    else toast.error(msg ? `${r.text}: ${msg}` : r.text, { duration: 12000 });
    router.replace("/settings#storage", { scroll: false });
  }, [status, msg, router]);

  return null;
}

export function DriveActions({ connected, hasConnection, pending }: { connected: boolean; hasConnection: boolean; pending: number }) {
  const [busy, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {!connected && (
        <Button asChild>
          {/* ต้องเป็นลิงก์ธรรมดา (ไม่ใช่ next/link) เพราะจะ redirect ออกไปหน้า Google */}
          <a href="/api/google/connect">
            <Link2 />
            {hasConnection ? "เชื่อมต่อใหม่" : "เชื่อมต่อ Google Drive"}
          </a>
        </Button>
      )}
      {connected && pending > 0 && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await syncPendingMedia();
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            })
          }
        >
          {busy ? <Loader2 className="animate-spin" /> : <CloudUpload />}
          บันทึกไฟล์ที่ค้างตอนนี้
        </Button>
      )}
      {hasConnection && (
        <ConfirmDialog
          title="ยกเลิกการเชื่อมต่อ Google Drive?"
          description="ไฟล์ที่เก็บไว้แล้วยังอยู่ใน Drive ครบ แต่ระบบจะเปิดดูไม่ได้จนกว่าจะเชื่อมต่อบัญชีเดิมอีกครั้ง และไฟล์ใหม่จะไม่ถูกเก็บ"
          confirmLabel="ยกเลิกการเชื่อมต่อ"
          onConfirm={async () => {
            const r = await disconnectGoogleDrive();
            if (r.ok) toast.success(r.message);
            else toast.error(r.error);
          }}
          trigger={
            <Button variant="ghost" className="text-muted-foreground">
              <Unplug />
              ยกเลิกการเชื่อมต่อ
            </Button>
          }
        />
      )}
    </div>
  );
}
