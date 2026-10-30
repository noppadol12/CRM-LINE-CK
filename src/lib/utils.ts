import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ตัวอักษรย่อสำหรับ Avatar เช่น "สมชาย ใจดี" → "สใ" */
export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => Array.from(p)[0] ?? "").join("").toUpperCase() || "?";
}

export const thNumber = new Intl.NumberFormat("th-TH");
