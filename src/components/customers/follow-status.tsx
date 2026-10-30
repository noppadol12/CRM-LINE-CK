import { cn } from "@/lib/utils";

const STATUS = {
  FOLLOWING: { label: "เป็นเพื่อน LINE", dot: "bg-emerald-500", text: "text-emerald-700" },
  UNFOLLOWED: { label: "บล็อก / เลิกติดตาม", dot: "bg-rose-500", text: "text-rose-700" },
  UNKNOWN: { label: "เพิ่มเอง", dot: "bg-slate-400", text: "text-muted-foreground" },
} as const;

export function FollowStatusBadge({ status, className }: { status: keyof typeof STATUS; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", s.text, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
