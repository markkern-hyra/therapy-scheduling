import { Badge } from "@/components/ui/badge";
import type { SlotStatus } from "@/lib/scheduling/status";

const BADGES = {
  Held: "held",
  Confirmed: "confirmed",
  Past: "muted",
} as const;

// Статус слоту → бейдж зі словом PM; вільний слот — без бейджа й без власного кольору (DESIGN.md, розділи 2 і 5).
export function StatusBadge({ status }: { status: SlotStatus }) {
  return status === "free" ? "Free" : <Badge variant={BADGES[status]}>{status}</Badge>;
}
