import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { formatCents } from "@/lib/format";

import classes from "./envelope-gauge.module.css";

interface EnvelopeGaugeProps {
  name: string;
  realCents: number;
  recommendedCents: number;
  /** Part recommandée du revenu (en %), pour expliquer le trait dans le tooltip. */
  recommendedPercent: number;
  /** D'où vient le montant réel (liste des catégories comptées). */
  sourceText: string;
  /** Dépense : « bien » si on reste sous le recommandé. Épargne : « bien » si on l'atteint. */
  kind: "expense" | "savings";
}

/** Jauge réel vs recommandé : la barre = le réel, le trait = le recommandé. */
export function EnvelopeGauge({
  name,
  realCents,
  recommendedCents,
  recommendedPercent,
  sourceText,
  kind,
}: EnvelopeGaugeProps) {
  const scale = Math.max(realCents, recommendedCents, 1) * 1.1;
  const onTrack =
    kind === "savings" ? realCents >= recommendedCents : realCents <= recommendedCents;

  return (
    <div>
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Group gap={4} wrap="nowrap">
          <Text size="sm" c="dimmed">
            {name}
          </Text>
          <Tooltip
            multiline
            w={260}
            withArrow
            label={`${sourceText} Recommandé : ${recommendedPercent} % des revenus de la période.`}
            events={{ hover: true, focus: true, touch: true }}
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              radius="xl"
              aria-label={`Comment est calculé « ${name} » ?`}
            >
              <IconInfoCircle size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Text size="sm" fw={600}>
          {formatCents(realCents)}
          <Text span size="xs" c="dimmed" fw={400}>
            {" "}
            / {formatCents(recommendedCents)}
          </Text>
        </Text>
      </Group>
      <div
        className={classes.track}
        role="img"
        aria-label={`${name} : ${formatCents(realCents)} sur ${formatCents(recommendedCents)} recommandés`}
      >
        <div
          className={classes.fill}
          data-on-track={onTrack}
          style={{ width: `${(realCents / scale) * 100}%` }}
        />
        <div className={classes.marker} style={{ left: `${(recommendedCents / scale) * 100}%` }} />
      </div>
    </div>
  );
}
