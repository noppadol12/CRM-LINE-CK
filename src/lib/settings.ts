import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return (row?.value as T | undefined) ?? null;
}

export async function setSetting<T>(key: string, value: T) {
  const json = value as unknown as Prisma.InputJsonValue;
  await prisma.appSetting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

export async function deleteSetting(key: string) {
  await prisma.appSetting.deleteMany({ where: { key } });
}
