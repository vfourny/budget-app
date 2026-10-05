import { Group, Stack, Text } from "@mantine/core";

import { DeltaBadge } from "@/components/delta-badge";
import { InfoTip } from "@/components/info-tip";
import type { GaugeGoal } from "@/components/target-gauge";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ForecastActual } from "@server/lib/professional/types";

interface AmountFigureProps {
  label: string;
  tip: string;
  amount: ForecastActual;
  /** Sens de l'écart réel − prévu (voir `DeltaBadge`) ; sans `goal`, pas de pastille d'écart. */
  goal?: GaugeGoal;
  /** Couleur du chiffre (token Mantine). */
  color?: string;
  size?: "md" | "lg";
}

/**
 * Un chiffre du dashboard Pro : libellé + info-bulle, valeur (réelle, sinon prévue) puis « prévu X »
 * et l'écart, ou « prévisionnel » pour un mois à venir.
 */
export function AmountFigure({ label, tip, amount, goal, color, size = "md" }: AmountFigureProps) {
  const isForecast = amount.actual === null;
  return (
    <Stack gap={2}>
      <Group gap={4} wrap="nowrap">
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <InfoTip label={tip} ariaLabel={fr.professional.howComputed(label)} />
      </Group>
      <Text
        fz={size === "lg" ? 26 : 18}
        fw={size === "lg" ? 600 : 700}
        c={isForecast ? "dimmed" : color}
      >
        {formatCents(amount.actual ?? amount.forecast)}
      </Text>
      <Group gap={6}>
        <Text size="xs" c="dimmed">
          {isForecast
            ? fr.professional.forecastOnly
            : fr.professional.forecastSub(formatCents(amount.forecast))}
        </Text>
        {goal && amount.actual !== null && (
          <DeltaBadge actual={amount.actual} forecast={amount.forecast} goal={goal} />
        )}
      </Group>
    </Stack>
  );
}
