import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CK CRM",
  description: "CRM สำหรับทีมขาย เชื่อมต่อ LINE OA",
  applicationName: "CK CRM",
  appleWebApp: { capable: true, title: "CK CRM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#00a24f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ใช้ env(safe-area-inset-*) กับแถบล่างเมื่อติดตั้งเป็นแอป
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-sans-thai)]">
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
