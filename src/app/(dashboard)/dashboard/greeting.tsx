import { getCurrentUser } from "@/lib/auth";

export async function Greeting() {
  const user = await getCurrentUser();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Bangkok" }).format(new Date()),
  );
  const hello = hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  return (
    <p className="-mt-4 text-sm text-muted-foreground">
      {hello} คุณ{user.name} · ภาพรวมลูกค้าและแชทวันนี้
    </p>
  );
}
