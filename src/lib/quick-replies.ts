import "server-only";
import { prisma } from "@/lib/prisma";

export function listQuickReplies() {
  return prisma.quickReply.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, body: true },
  });
}

export type QuickReplyItem = Awaited<ReturnType<typeof listQuickReplies>>[number];
