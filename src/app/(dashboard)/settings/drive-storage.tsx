import { AlertTriangle, CheckCircle2, ExternalLink, HardDrive } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { driveQuota, getDriveConnection, googleClient } from "@/lib/google-drive";
import { mediaStats } from "@/lib/media";
import { canManage } from "@/lib/permissions";
import { thNumber } from "@/lib/utils";
import { DriveActions } from "./drive-actions";

function bytes(n: number | null) {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function DriveStorage() {
  const user = await getCurrentUser();
  const manager = canManage(user);
  const configured = Boolean(googleClient());
  const [conn, stats] = await Promise.all([getDriveConnection(), mediaStats()]);
  const connected = Boolean(conn && !conn.error);
  const quota = connected ? await driveQuota().catch(() => null) : null;

  return (
    <Card id="storage" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>ที่เก็บไฟล์ (Google Drive)</CardTitle>
        <CardDescription>
          LINE เก็บรูปและไฟล์ที่ลูกค้าส่งมาไว้ชั่วคราวเท่านั้น ระบบจะคัดลอกไปเก็บถาวรใน Google Drive ของบริษัทอัตโนมัติ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!configured ? (
          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              ยังไม่ได้ตั้ง <code>GOOGLE_CLIENT_ID</code> และ <code>GOOGLE_CLIENT_SECRET</code> ใน Vercel → Settings → Environment
              Variables (เพิ่มแล้วต้อง Redeploy)
            </p>
          </div>
        ) : conn?.error ? (
          <div className="flex gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">การเชื่อมต่อใช้งานไม่ได้</p>
              <p>{conn.error}</p>
            </div>
          </div>
        ) : conn ? (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <HardDrive className="size-5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600" />
                เชื่อมต่อแล้ว
              </p>
              <p className="truncate text-muted-foreground">{conn.email ?? "บัญชี Google"}</p>
              <p className="text-xs text-muted-foreground">
                โดย {conn.connectedBy ?? "—"} · {formatDateTime(new Date(conn.connectedAt))}
              </p>
              <a
                href={`https://drive.google.com/drive/folders/${conn.rootFolderId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                เปิดโฟลเดอร์ใน Google Drive <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่ได้เชื่อมต่อ — ตอนนี้รูปและไฟล์ดึงจาก LINE โดยตรง และจะหายเมื่อ LINE ลบไฟล์</p>
        )}

        {connected && quota?.usage != null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>พื้นที่ Google ที่ใช้ไป</span>
              <span className="tabular-nums">
                {bytes(quota.usage)} / {quota.limit ? bytes(quota.limit) : "ไม่จำกัด"}
              </span>
            </div>
            {quota.limit && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (quota.usage / quota.limit) * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 border-t pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">เก็บแล้ว</p>
            <p className="font-medium tabular-nums">{thNumber.format(stats.saved)} ไฟล์</p>
            <p className="text-xs text-muted-foreground tabular-nums">{bytes(stats.bytes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">รอบันทึก</p>
            <p className="font-medium tabular-nums">{thNumber.format(stats.pending)} ไฟล์</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ไม่สำเร็จ/หมดอายุ</p>
            <p className="font-medium tabular-nums">{thNumber.format(stats.failed)} ไฟล์</p>
          </div>
        </div>

        {manager && configured && <DriveActions connected={connected} hasConnection={Boolean(conn)} pending={stats.pending} />}
        {!manager && <p className="text-xs text-muted-foreground">เฉพาะเจ้าของและแอดมินที่เชื่อมต่อหรือเปลี่ยนบัญชีได้</p>}
      </CardContent>
    </Card>
  );
}
