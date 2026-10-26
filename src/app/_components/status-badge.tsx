import { Badge } from "@/components/ui/badge";
import type { SlotStatus } from "@/lib/scheduling/status";

const BADGES = {
  Held: "held",
  Confirmed: "confirmed",
  Past: "muted",
} as const;

// Статус зайнятого чи минулого слоту → бейдж зі словом PM; вільний слот бейджа не має (DESIGN.md, розділи 2 і 5).
export function StatusBadge({ status }: { status: Exclude<SlotStatus, "free"> }) {
  return <Badge variant={BADGES[status]}>{status}</Badge>;
}
