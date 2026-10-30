import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  icon: Icon,
  phase,
  title,
  points,
}: {
  icon: LucideIcon;
  phase: number;
  title: string;
  points: string[];
}) {
  return (
    <Card className="items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-6" />
      </span>
      <div className="space-y-2">
        <Badge variant="soft">Phase {phase}</Badge>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <ul className="max-w-sm space-y-1.5 text-sm text-muted-foreground">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Card>
  );
}
