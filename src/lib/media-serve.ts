import "server-only";
import { fileResponse } from "@/lib/file-response";
import { downloadFromDrive, getDriveSession } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

/** ส่งไฟล์ของข้อความ (ที่เก็บใน Google Drive) — ใช้ทั้งหน้าแชทและลิงก์ที่ส่งให้ลูกค้า */
export async function serveMessageFile(id: string, request: Request, opts: { publicLink: boolean }) {
  const msg = await prisma.chatMessage.findUnique({
    where: { id },
    select: { type: true, text: true, driveFileId: true, mediaMime: true, direction: true },
  });
  if (!msg?.driveFileId) return new Response("Not found", { status: 404 });
  // ลิงก์สาธารณะใช้ได้เฉพาะไฟล์ที่ทีมส่งให้ลูกค้าเท่านั้น
  if (opts.publicLink && msg.direction !== "OUTBOUND") return new Response("Not found", { status: 404 });

  const drive = await getDriveSession().catch(() => null);
  if (!drive) return new Response("Google Drive ไม่ได้เชื่อมต่อ", { status: 503 });

  const res = await downloadFromDrive(drive.token, msg.driveFileId, request.headers.get("range"));
  if ((!res.ok && res.status !== 206) || !res.body) {
    return new Response(res.status === 404 ? "ไฟล์ถูกลบจาก Google Drive แล้ว" : "Upstream error", { status: res.status === 404 ? 410 : 502 });
  }
  return fileResponse(res, {
    mime: msg.mediaMime,
    fileName: msg.type === "FILE" ? msg.text : null,
    cache: opts.publicLink ? "public, max-age=31536000, immutable" : "private, max-age=86400",
  });
}
