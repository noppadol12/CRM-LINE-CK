import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// เปิดดูในเบราว์เซอร์ได้เฉพาะชนิดที่ปลอดภัย ที่เหลือ (เช่น .html/.svg) บังคับดาวน์โหลด กันสคริปต์รันบนโดเมนเรา
const SAFE_INLINE = /^(image\/(jpeg|png|gif|webp)|video\/|audio\/|application\/pdf$)/;

/** ส่งต่อไฟล์จาก upstream (LINE / Google Drive) พร้อม header ที่ปลอดภัย */
export function fileResponse(
  res: Response,
  opts: { mime?: string | null; fileName?: string | null; cache?: string; forceDownload?: boolean },
) {
  const type = (res.headers.get("content-type") ?? opts.mime ?? "application/octet-stream").split(";")[0].trim();
  const inline = SAFE_INLINE.test(type) && !opts.forceDownload;
  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": opts.cache ?? "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  });
  if (type !== "application/pdf") headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
  for (const h of ["content-length", "content-range", "accept-ranges"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  const disposition = inline ? "inline" : "attachment";
  headers.set("Content-Disposition", opts.fileName ? `${disposition}; filename*=UTF-8''${encodeURIComponent(opts.fileName)}` : disposition);
  return new Response(res.body, { status: res.status, headers });
}

/** ลายเซ็นสำหรับลิงก์ไฟล์ที่ส่งให้ลูกค้า (เปิดได้โดยไม่ต้องล็อกอิน แต่เดาลิงก์ไม่ได้) */
function mediaSignature(id: string) {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  return createHmac("sha256", `ckcrm-media:${secret}`).update(id).digest("base64url").slice(0, 32);
}

export function signMediaId(id: string) {
  return mediaSignature(id);
}

export function verifyMediaSignature(id: string, sig: string) {
  const expected = Buffer.from(mediaSignature(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** โดเมนที่ LINE ใช้ดึงไฟล์ (ต้องเป็น production เสมอ เพราะ preview URL ของ Vercel ต้องล็อกอิน) */
export function publicBaseUrl(fallbackOrigin: string) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : fallbackOrigin;
}
