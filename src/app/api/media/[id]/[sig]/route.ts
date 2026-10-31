import { verifyMediaSignature } from "@/lib/file-response";
import { serveMessageFile } from "@/lib/media-serve";

/** GET /api/media/:id/:sig — ลิงก์ไฟล์ที่ส่งให้ลูกค้าทาง LINE (ไม่ต้องล็อกอิน ตรวจลายเซ็นแทน) */
export async function GET(request: Request, ctx: RouteContext<"/api/media/[id]/[sig]">) {
  const { id, sig } = await ctx.params;
  if (!verifyMediaSignature(id, sig)) return new Response("Not found", { status: 404 });
  return serveMessageFile(id, request, { publicLink: true });
}
