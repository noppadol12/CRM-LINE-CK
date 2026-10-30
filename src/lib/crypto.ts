import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * เข้ารหัสข้อมูลลับก่อนเก็บลงฐานข้อมูล (เช่น refresh token ของ Google) ด้วย AES-256-GCM
 * กุญแจมาจาก TOKEN_ENCRYPTION_KEY หรือ AUTH_SECRET — ถ้าเปลี่ยนค่านี้ต้องเชื่อมต่อ Google Drive ใหม่
 */
function key() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("ต้องตั้ง AUTH_SECRET (อย่างน้อย 32 ตัวอักษร) ก่อน");
  return createHash("sha256").update(`ckcrm-token:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(sealed: string): string {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("รูปแบบข้อมูลเข้ารหัสไม่ถูกต้อง");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
