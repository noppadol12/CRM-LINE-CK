"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="คัดลอก"
      className="rounded p-1 hover:bg-accent hover:text-foreground"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
    </button>
  );
}
