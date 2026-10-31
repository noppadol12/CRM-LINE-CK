import { headers } from "next/headers";
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, timeAgo } from "@/lib/format";
import { getChannelSecret, getLineClient } from "@/lib/line";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cn, thNumber } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { WebhookActions } from "./webhook-actions";
import { RetryWebhooksButton } from "./retry-webhooks-button";
import { getMessageQuota } from "@/lib/line-send";

type Check = { ok: boolean | null; label: string; detail?: string };

async function expectedWebhookUrl() {
  // ใช้โดเมน production เสมอ แม้เปิดหน้านี้จาก preview URL
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}/api/line/webhook`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/line/webhook`;
}

function startOfMonthBangkok(): Date {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, 1, -7));
}

async function loadLineStatus() {
  const client = getLineClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [bot, endpoint, last, count24h, failed, stuck, quota, freeReplies] = await Promise.all([
    client?.getBotInfo().catch((e: Error) => ({ error: e.message })) ?? null,
    client?.getWebhookEndpoint().catch(() => null) ?? null,
    prisma.webhookEvent.findFirst({ orderBy: { receivedAt: "desc" }, select: { receivedAt: true, type: true } }),
    prisma.webhookEvent.count({ where: { receivedAt: { gte: since } } }),
    prisma.webhookEvent.count({
      where: { receivedAt: { gte: since }, error: { not: null }, NOT: { error: { startsWith: "skip" } } },
    }),
    // ยังไม่ได้ประมวลผล (ผิดพลาด หรือค้างเกิน 2 นาที) ภายใน 7 วัน
    prisma.webhookEvent.count({
      where: {
        processedAt: null,
        receivedAt: { lte: new Date(Date.now() - 2 * 60_000), gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    getMessageQuota(),
    // ข้อความที่ตอบฟรีด้วย reply token ในเดือนนี้ (เวลาไทย)
    prisma.chatMessage.count({ where: { sentVia: "reply", sentAt: { gte: startOfMonthBangkok() } } }),
  ]);
  return { hasClient: Boolean(client), bot, endpoint, last, count24h, failed, stuck, quota, freeReplies };
}

export async function LineConnection() {
  const user = await getCurrentUser();
  const hasSecret = Boolean(getChannelSecret());
  const url = await expectedWebhookUrl();
  const { hasClient, bot, endpoint, last, count24h, failed, stuck, quota, freeReplies } = await loadLineStatus();
  const client = hasClient;

  const botOk = bot && !("error" in bot) ? bot : null;
  const endpointMatches = endpoint?.endpoint === url;

  const checks: Check[] = [
    {
      ok: client ? Boolean(botOk) : false,
      label: "Channel access token",
      detail: !client ? "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" : botOk ? "ใช้งานได้" : "token ไม่ถูกต้องหรือหมดอายุ",
    },
    { ok: hasSecret, label: "Channel secret", detail: hasSecret ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้ง LINE_CHANNEL_SECRET" },
    {
      ok: endpoint ? endpointMatches : null,
      label: "Webhook URL ชี้มาที่ระบบนี้",
      detail: endpoint ? (endpointMatches ? "ถูกต้อง" : endpoint.endpoint ? `ตอนนี้ชี้ไปที่ ${endpoint.endpoint}` : "ยังไม่ได้ตั้ง") : undefined,
    },
    {
      ok: endpoint ? endpoint.active : null,
      label: "เปิดใช้ Webhook",
      detail: endpoint ? (endpoint.active ? "เปิดอยู่" : "ปิดอยู่ — เปิด “Use webhook” ใน LINE Developers Console") : undefined,
    },
  ];

  return (
    <Card id="line" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>การเชื่อมต่อ LINE OA</CardTitle>
        <CardDescription>รับข้อความ การเพิ่มเพื่อน และการบล็อกจาก LINE เข้าระบบอัตโนมัติ</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {botOk && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <Avatar className="size-10">
              {botOk.pictureUrl && <AvatarImage src={botOk.pictureUrl} alt="" />}
              <AvatarFallback>OA</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{botOk.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {botOk.basicId} · แชท {botOk.chatMode === "chat" ? "เปิด" : "ปิด (บอทอย่างเดียว)"}
              </p>
            </div>
          </div>
        )}

        <ul className="space-y-2.5">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-2.5 text-sm">
              {c.ok === true ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : c.ok === false ? (
                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p>{c.label}</p>
                {c.detail && <p className={cn("text-xs break-all", c.ok === false ? "text-rose-600" : "text-muted-foreground")}>{c.detail}</p>}
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Webhook URL ของระบบนี้</p>
          <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
            <CopyButton value={url} />
          </div>
        </div>

        {canManage(user) && client && <WebhookActions url={url} configured={endpointMatches} />}

        <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">event ล่าสุด</p>
            <p className="font-medium" title={last ? formatDateTime(last.receivedAt) : undefined}>
              {last ? `${timeAgo(last.receivedAt)} (${last.type})` : "ยังไม่เคยได้รับ"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24 ชม. ที่ผ่านมา</p>
            <p className="font-medium">
              {thNumber.format(count24h)} event
              {failed > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-rose-600">
                  <AlertTriangle className="size-3" />
                  ผิดพลาด {failed}
                </span>
              )}
            </p>
          </div>
        </div>

        {quota && (
          <div className="space-y-1.5 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">โควตาข้อความเดือนนี้</span>
              <span className="font-medium tabular-nums">
                {thNumber.format(quota.used)} / {quota.limit == null ? "ไม่จำกัด" : thNumber.format(quota.limit)}
              </span>
            </div>
            {quota.limit != null && quota.limit > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", quota.used / quota.limit > 0.9 ? "bg-rose-500" : "bg-primary")}
                  style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              นับเฉพาะ Push · ตอบฟรีด้วย Reply เดือนนี้ {thNumber.format(freeReplies)} ข้อความ (ระบบใช้ Reply อัตโนมัติเมื่อตอบภายในไม่ถึง 1 นาที)
            </p>
          </div>
        )}

        {canManage(user) && stuck > 0 && <RetryWebhooksButton count={stuck} />}
      </CardContent>
    </Card>
  );
}
