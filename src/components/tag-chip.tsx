import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tagColor } from "@/lib/tag-colors";

export function TagChip({
  name,
  color,
  className,
  onRemove,
}: {
  name: string;
  color: string;
  className?: string;
  onRemove?: () => void;
}) {
  const c = tagColor(color);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        c.chip,
        onRemove && "pr-1",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`เอาแท็ก ${name} ออก`}
          className="rounded-full p-0.5 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
