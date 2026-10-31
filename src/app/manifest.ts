import type { MetadataRoute } from "next";

/** ติดตั้ง CK CRM เป็นแอปบนมือถือ/คอม (Add to Home Screen) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CK CRM",
    short_name: "CK CRM",
    description: "CRM ทีมขาย CK Aircondition — แชท LINE OA ลูกค้า ดีล",
    id: "/",
    start_url: "/chats",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#00a24f",
    lang: "th",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "แชท", url: "/chats" },
      { name: "ดีล", url: "/deals" },
    ],
  };
}
