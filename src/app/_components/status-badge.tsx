import { Badge } from "@/components/ui/badge";
import type { SlotStatus } from "@/lib/scheduling/status";

// Статус слоту → бейдж зі словом PM; вільний слот — без бейджа (DESIGN.md, розділ 2).
export function StatusBadge({ status }: { status: SlotStatus }) {
  return status === "free" ? "Free" : <Badge variant="muted">Past</Badge>;
}
