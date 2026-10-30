import type { Metadata } from "next";
import { Suspense } from "react";
import { MessageCircle, Users, Gift } from "lucide-react";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/layout/brand";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · CK CRM" };

const HIGHLIGHTS = [
  { icon: Users, text: "ข้อมูลลูกค้าจาก LINE OA รวมไว้ที่เดียว" },
  { icon: MessageCircle, text: "ดูประวัติแชทและตอบลูกค้าได้จากหลังบ้าน" },
  { icon: Gift, text: "สะสมและแลกแต้มลูกค้าได้ทันที" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[oklch(0.3_0.06_160)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-[oklch(0.62_0.17_152)] opacity-25 blur-3xl"
        />
        <BrandMark tone="light" />
        <div className="relative max-w-md space-y-8">
          <h1 className="text-4xl leading-tight font-semibold text-balance">
            ดูแลลูกค้าทุกคน
            <br />
            ที่ทักมาทาง LINE
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">© CK Aircondition</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">เข้าสู่ระบบ</h2>
            <p className="text-sm text-muted-foreground">สำหรับทีมแอดมินและเซลส์</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
