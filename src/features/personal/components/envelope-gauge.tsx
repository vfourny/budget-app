import { Group, Text } from "@mantine/core";

import { formatCents } from "@/lib/format";

import classes from "./envelope-gauge.module.css";

interface EnvelopeGaugeProps {
  name: string;
  realCents: number;
  recommendedCents: number;
  /** Dépense : « bien » si on reste sous le recommandé. Épargne : « bien » si on l'atteint. */
  kind: "expense" | "savings";
}

/** Jauge réel vs recommandé : la barre = le réel, le trait = le recommandé. */
export function EnvelopeGauge({ name, realCents, recommendedCents, kind }: EnvelopeGaugeProps) {
  const scale = Math.max(realCents, recommendedCents, 1) * 1.1;
  const onTrack =
    kind === "savings" ? realCents >= recommendedCents : realCents <= recommendedCents;

  return (
    <div>
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text size="sm" c="dimmed">
          {name}
        </Text>
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
