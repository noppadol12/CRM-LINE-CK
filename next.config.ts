import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // header ความปลอดภัยพื้นฐานทุกหน้า
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  cacheComponents: true,
  // ส่งรูป/ไฟล์ให้ลูกค้าผ่าน Server Action (Vercel รับ request ได้ไม่เกิน ~4.5 MB)
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
