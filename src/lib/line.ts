import "server-only";
import { messagingApi } from "@line/bot-sdk";

/** คืน LINE client หรือ null ถ้ายังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN */
export function getLineClient(): messagingApi.MessagingApiClient | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return null;
  return new messagingApi.MessagingApiClient({ channelAccessToken: token });
}

export function getChannelSecret(): string | null {
  return process.env.LINE_CHANNEL_SECRET?.trim() || null;
}

/** ดึงโปรไฟล์ LINE — คืน null ถ้าลูกค้าบล็อก OA หรือดึงไม่ได้ (ไม่ทำให้การบันทึกข้อความล้ม) */
export async function fetchLineProfile(userId: string) {
  const client = getLineClient();
  if (!client) return null;
  try {
    const p = await client.getProfile(userId);
    return { displayName: p.displayName, pictureUrl: p.pictureUrl ?? null, statusMessage: p.statusMessage ?? null };
  } catch (error) {
    console.warn(`[line] getProfile ${userId} failed`, error instanceof Error ? error.message : error);
    return null;
  }
}
