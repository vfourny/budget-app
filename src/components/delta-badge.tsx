import { Badge } from "@mantine/core";

import type { GaugeGoal } from "@/components/target-gauge";
import { formatCents } from "@/lib/format";

interface DeltaBadgeProps {
  /** Centimes. */
  actual: number;
  forecast: number;
  /** `"atLeast"` : au-dessus du prévu = bien (CA, bénéfice). `"atMost"` : en dessous = bien (charges). */
  goal: GaugeGoal;
}

/** Écart réel − prévu, signé : vert si c'est bien, rouge sinon, doré pile sur le prévu. */
export function DeltaBadge({ actual, forecast, goal }: DeltaBadgeProps) {
  const delta = actual - forecast;
  const good = goal === "atLeast" ? delta > 0 : delta < 0;
  return (
    <Badge variant="light" color={delta === 0 ? "gold" : good ? "teal" : "red"} tt="none">
      {delta > 0 ? "+ " : delta < 0 ? "− " : ""}
      {formatCents(Math.abs(delta))}
    </Badge>
  );
}
