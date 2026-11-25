import "server-only";
import { DEFAULT_SENDER, type Sender } from "@/lib/labels";
import { getSetting } from "@/lib/settings";

/** ข้อมูลผู้ส่งบนใบปะหน้า (ตั้งค่า → ข้อมูลผู้ส่ง) */
export async function getSender(): Promise<Sender> {
  const s = await getSetting<Partial<Sender>>("sender");
  return {
    name: s?.name?.trim() || DEFAULT_SENDER.name,
    phone: s?.phone?.trim() || DEFAULT_SENDER.phone,
    address: s?.address?.trim() || DEFAULT_SENDER.address,
  };
}
