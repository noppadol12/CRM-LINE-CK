"use server";

import { refresh } from "next/cache";
import { disconnectDrive as disconnect, getDriveConnection } from "@/lib/google-drive";
import { savePendingMedia } from "@/lib/media";
import { NO_PERMISSION, requireManager, type ActionResult } from "@/lib/permissions";

export async function disconnectGoogleDrive(): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  await disconnect();
  refresh();
  return { ok: true, message: "ยกเลิกการเชื่อมต่อแล้ว ไฟล์เดิมยังอยู่ใน Google Drive ครบ" };
}

/** บันทึกไฟล์ที่ยังค้างลง Drive ทันที (ทำได้ประมาณ 40 วินาทีต่อครั้ง) */
export async function syncPendingMedia(): Promise<ActionResult> {
  if (!(await requireManager())) return NO_PERMISSION;
  const conn = await getDriveConnection();
  if (!conn || conn.error) return { ok: false, error: "ยังไม่ได้เชื่อมต่อ Google Drive" };

  const { counts, remaining } = await savePendingMedia({ deadline: Date.now() + 40_000 });
  refresh();
  const saved = counts.saved ?? 0;
  const problems = (counts.failed ?? 0) + (counts.expired ?? 0);
  if (counts["not-connected"]) return { ok: false, error: "เชื่อมต่อ Google Drive ไม่ได้ กรุณาเชื่อมต่อใหม่" };
  const parts = [`บันทึกแล้ว ${saved} ไฟล์`];
  if (problems) parts.push(`ไม่สำเร็จ/หมดอายุ ${problems}`);
  if (remaining > 0) parts.push(`เหลืออีก ${remaining} — กดอีกครั้งเพื่อทำต่อ`);
  return { ok: true, message: saved || problems || remaining ? parts.join(" · ") : "ไม่มีไฟล์ค้าง" };
}
