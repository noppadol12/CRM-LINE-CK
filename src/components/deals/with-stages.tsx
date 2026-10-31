import type { ReactNode } from "react";
import { listStages } from "@/lib/stages";
import { StagesProvider } from "./stages-context";

/** โหลดขั้นของดีลจากฐานข้อมูล แล้วส่งให้ component ฝั่ง client ที่อยู่ข้างใน */
export async function WithStages({ children }: { children: ReactNode }) {
  const stages = await listStages();
  return <StagesProvider stages={stages}>{children}</StagesProvider>;
}
