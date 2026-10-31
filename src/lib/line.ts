import "server-only";
import { messagingApi } from "@line/bot-sdk";

/** คืน LINE client หรือ null ถ้ายังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN */
export function getLineClient(): messagingApi.MessagingApiClient | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return null;
  // LINE_API_BASE ใช้สำหรับทดสอบกับเซิร์ฟเวอร์จำลองเท่านั้น
  return new messagingApi.MessagingApiClient({
    channelAccessToken: token,
    ...(process.env.LINE_API_BASE ? { baseURL: process.env.LINE_API_BASE } : {}),
  });
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

/** ชื่อ/รูปของกลุ่ม LINE (ห้องแชทหลายคนไม่มีชื่อ) */
export async function fetchGroupSummary(groupId: string) {
  const client = getLineClient();
  if (!client) return null;
  try {
    const g = await client.getGroupSummary(groupId);
    return { name: g.groupName, pictureUrl: g.pictureUrl ?? null };
  } catch (error) {
    console.warn(`[line] getGroupSummary ${groupId} failed`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** โปรไฟล์สมาชิกในกลุ่ม/ห้อง (ดึงได้แม้ยังไม่ได้เพิ่มเพื่อน OA) */
export async function fetchMemberProfile(chatType: "group" | "room", chatId: string, userId: string) {
  const client = getLineClient();
  if (!client) return null;
  try {
    const p = chatType === "group" ? await client.getGroupMemberProfile(chatId, userId) : await client.getRoomMemberProfile(chatId, userId);
    return { displayName: p.displayName, pictureUrl: p.pictureUrl ?? null };
  } catch (error) {
    console.warn(`[line] member profile ${userId} failed`, error instanceof Error ? error.message : error);
    return null;
  }
}
