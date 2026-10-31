import { getApiUser } from "@/lib/auth";
import { serveMessageFile } from "@/lib/media-serve";

/** GET /api/media/:id — ไฟล์ของข้อความ (ต้องล็อกอิน) */
export async function GET(request: Request, ctx: RouteContext<"/api/media/[id]">) {
  if (!(await getApiUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  return serveMessageFile(id, request, { publicLink: false });
}
