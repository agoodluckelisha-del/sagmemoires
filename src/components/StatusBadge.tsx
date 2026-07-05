import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { label: "En attente", cls: "bg-warning/15 text-warning border-warning/30" },
    approved: { label: "Validé", cls: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Rejeté", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  } as const;
  const s = map[status];
  return (
    <Badge variant="outline" className={cn("font-medium", s.cls)}>
      {s.label}
    </Badge>
  );
}
