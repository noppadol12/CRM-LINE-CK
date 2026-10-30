import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { deleteSetting, getSetting, setSetting } from "@/lib/settings";

/**
 * Google Drive (OAuth 2.0, scope drive.file)
 * - ระบบเห็นและแก้ได้เฉพาะไฟล์/โฟลเดอร์ที่ระบบสร้างเองเท่านั้น
 * - refresh token เข้ารหัสก่อนเก็บในตาราง app_settings
 * เรียก REST API ตรงด้วย fetch (ไม่ต้องลงไลบรารี googleapis ที่ใหญ่มาก)
 */

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const SETTING_KEY = "google_drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

// เปลี่ยนได้เพื่อทดสอบกับเซิร์ฟเวอร์จำลองเท่านั้น
const AUTH_URL = () => process.env.GOOGLE_AUTH_URL ?? "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_BASE = () => process.env.GOOGLE_OAUTH_BASE ?? "https://oauth2.googleapis.com";
const API_BASE = () => process.env.GOOGLE_API_BASE ?? "https://www.googleapis.com";

export type DriveConnection = {
  refreshToken: string; // เข้ารหัสแล้ว
  email: string | null;
  name: string | null;
  rootFolderId: string;
  connectedAt: string;
  connectedBy: string | null;
  folders: Record<string, string>; // "2026-10" → folder id
  error?: string | null; // เช่น สิทธิ์ถูกยกเลิก → ต้องเชื่อมต่อใหม่
};

export class DriveAuthError extends Error {}

export function googleClient() {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

/** ต้องตรงกับ Authorized redirect URI ใน Google Cloud ทุกตัวอักษร */
export function googleRedirectUri(origin: string) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI.trim();
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return `${prod ? `https://${prod}` : origin}/api/google/callback`;
}

export function getDriveConnection() {
  return getSetting<DriveConnection>(SETTING_KEY);
}

async function saveConnection(c: DriveConnection) {
  await setSetting(SETTING_KEY, c);
}

export function buildAuthUrl(origin: string, state: string) {
  const client = googleClient();
  if (!client) throw new Error("ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  const url = new URL(AUTH_URL());
  url.search = new URLSearchParams({
    client_id: client.id,
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent", // บังคับให้ได้ refresh token ทุกครั้ง
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.toString();
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH_BASE()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  return (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as TokenResponse;
}

// access token อายุ ~1 ชม. เก็บไว้ในหน่วยความจำของ function
let cached: { token: string; expiresAt: number; source: string } | null = null;

async function accessTokenFor(conn: DriveConnection): Promise<string> {
  if (cached && cached.source === conn.refreshToken && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const client = googleClient();
  if (!client) throw new DriveAuthError("ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");

  let refresh: string;
  try {
    refresh = decryptSecret(conn.refreshToken);
  } catch {
    throw await markBroken(conn, "ถอดรหัส token ไม่ได้ (AUTH_SECRET เปลี่ยน?) กรุณาเชื่อมต่อใหม่");
  }
  const r = await tokenRequest({
    client_id: client.id,
    client_secret: client.secret,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  if (!r.access_token) {
    if (r.error === "invalid_grant" || r.error === "unauthorized_client" || r.error === "invalid_client") {
      throw await markBroken(conn, "สิทธิ์เข้าถึง Google Drive ถูกยกเลิกหรือหมดอายุ กรุณาเชื่อมต่อใหม่");
    }
    throw new Error(`ขอ access token ไม่สำเร็จ: ${r.error ?? "unknown"}`);
  }
  cached = { token: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000, source: conn.refreshToken };
  return r.access_token;
}

async function markBroken(conn: DriveConnection, error: string) {
  cached = null;
  await saveConnection({ ...conn, error });
  return new DriveAuthError(error);
}

async function driveFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  return res;
}

async function driveJson<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await driveFetch(token, path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Drive ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function createFolder(token: string, name: string, parent?: string) {
  const f = await driveJson<{ id: string }>(token, "/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) }),
  });
  return f.id;
}

async function folderUsable(token: string, id: string) {
  const res = await driveFetch(token, `/drive/v3/files/${encodeURIComponent(id)}?fields=id,trashed`);
  if (!res.ok) return false;
  const f = (await res.json()) as { trashed?: boolean };
  return !f.trashed;
}

/** หลังผู้ใช้กดอนุญาต: แลก code → refresh token, สร้างโฟลเดอร์หลัก แล้วบันทึกการเชื่อมต่อ */
export async function completeConnection(code: string, origin: string, actorName: string) {
  const client = googleClient();
  if (!client) throw new Error("ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  const t = await tokenRequest({
    code,
    client_id: client.id,
    client_secret: client.secret,
    redirect_uri: googleRedirectUri(origin),
    grant_type: "authorization_code",
  });
  if (!t.access_token) throw new Error(t.error_description ?? t.error ?? "แลก token ไม่สำเร็จ");
  if (!t.refresh_token) throw new Error("Google ไม่ส่ง refresh token กลับมา ลองกดเชื่อมต่อใหม่อีกครั้ง");
  if (t.scope && !t.scope.split(" ").includes(DRIVE_SCOPE)) {
    throw new Error("ไม่ได้ติ๊กอนุญาตสิทธิ์ Google Drive ในหน้ายืนยัน กรุณาลองใหม่และติ๊กช่อง Drive");
  }

  const token = t.access_token;
  const about = await driveJson<{ user?: { emailAddress?: string; displayName?: string } }>(
    token,
    "/drive/v3/about?fields=user(emailAddress,displayName)",
  );
  const email = about.user?.emailAddress ?? null;

  // เชื่อมต่อบัญชีเดิมซ้ำ → ใช้โฟลเดอร์เดิมต่อ (ถ้ายังไม่ถูกลบ)
  const prev = await getDriveConnection();
  const reuse = prev && prev.email === email && (await folderUsable(token, prev.rootFolderId));
  const rootFolderId = reuse ? prev.rootFolderId : await createFolder(token, "CK CRM - ไฟล์จาก LINE");

  const conn: DriveConnection = {
    refreshToken: encryptSecret(t.refresh_token),
    email,
    name: about.user?.displayName ?? null,
    rootFolderId,
    connectedAt: new Date().toISOString(),
    connectedBy: actorName,
    folders: reuse ? prev.folders : {},
    error: null,
  };
  await saveConnection(conn);
  cached = { token, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000, source: conn.refreshToken };
  return conn;
}

export async function disconnectDrive() {
  const conn = await getDriveConnection();
  if (conn) {
    try {
      const refresh = decryptSecret(conn.refreshToken);
      await fetch(`${OAUTH_BASE()}/revoke?token=${encodeURIComponent(refresh)}`, { method: "POST" });
    } catch {
      // ยกเลิกสิทธิ์ฝั่ง Google ไม่ได้ก็ไม่เป็นไร ลบการเชื่อมต่อในระบบต่อ
    }
  }
  cached = null;
  await deleteSetting(SETTING_KEY);
}

/** คืน token + การเชื่อมต่อที่ใช้งานได้ หรือ null ถ้ายังไม่ได้เชื่อม/ต้องเชื่อมใหม่ */
export async function getDriveSession() {
  const conn = await getDriveConnection();
  if (!conn || conn.error || !googleClient()) return null;
  const token = await accessTokenFor(conn);
  return { conn, token };
}

/** หา/สร้างโฟลเดอร์ย่อยรายเดือนใต้โฟลเดอร์หลัก */
export async function monthFolder(session: { conn: DriveConnection; token: string }, month: string) {
  const { conn, token } = session;
  const known = conn.folders?.[month];
  if (known) return known;

  const q = `name = '${month}' and '${conn.rootFolderId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`;
  const found = await driveJson<{ files: { id: string }[] }>(token, `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  const id = found.files[0]?.id ?? (await createFolder(token, month, conn.rootFolderId));

  // อ่านค่าล่าสุดก่อนเขียน กันทับโฟลเดอร์ของเดือนอื่นที่เพิ่งบันทึก
  const latest = (await getDriveConnection()) ?? conn;
  const next = { ...latest, folders: { ...(latest.folders ?? {}), [month]: id } };
  await saveConnection(next);
  session.conn = next;
  return id;
}

/** อัปโหลดไฟล์แบบ resumable (รองรับไฟล์ใหญ่) */
export async function uploadToDrive(
  token: string,
  file: { name: string; mime: string; data: Uint8Array; folderId: string; description?: string },
) {
  const init = await driveFetch(token, "/upload/drive/v3/files?uploadType=resumable&fields=id,size", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.mime,
      "X-Upload-Content-Length": String(file.data.byteLength),
    },
    body: JSON.stringify({ name: file.name, parents: [file.folderId], mimeType: file.mime, description: file.description }),
  });
  const location = init.headers.get("location");
  if (!init.ok || !location) {
    throw new Error(`เริ่มอัปโหลดไม่สำเร็จ (${init.status}): ${(await init.text().catch(() => "")).slice(0, 200)}`);
  }
  const put = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": file.mime, "Content-Length": String(file.data.byteLength) },
    body: Buffer.from(file.data),
  });
  if (!put.ok) throw new Error(`อัปโหลดไม่สำเร็จ (${put.status}): ${(await put.text().catch(() => "")).slice(0, 200)}`);
  return (await put.json()) as { id: string; size?: string };
}

/** ดึงไฟล์จาก Drive (รองรับ Range สำหรับเลื่อนดูวิดีโอ) */
export async function downloadFromDrive(token: string, fileId: string, range?: string | null) {
  return driveFetch(token, `/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: range ? { Range: range } : {},
  });
}

export async function driveQuota() {
  const s = await getDriveSession();
  if (!s) return null;
  const about = await driveJson<{ storageQuota?: { limit?: string; usage?: string } }>(s.token, "/drive/v3/about?fields=storageQuota(limit,usage)");
  const q = about.storageQuota ?? {};
  return { limit: q.limit ? Number(q.limit) : null, usage: q.usage ? Number(q.usage) : null };
}
