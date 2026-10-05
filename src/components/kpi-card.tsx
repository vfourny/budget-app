import { Group, Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: ReactNode;
  value: string;
  hint?: ReactNode;
  /** Couleur du chiffre (token Mantine, ex. `"gold.6"`). */
  color?: string;
  children?: ReactNode;
}

/** Carte d'indicateur : libellé, grand chiffre, aide, puis un détail optionnel (lignes, jauges). */
export function KpiCard({ label, value, hint, color, children }: KpiCardProps) {
  return (
    <Paper withBorder radius="lg" p={24} h="100%">
      <Stack gap={6}>
        <Text size="sm" c="dimmed" component="div">
          {label}
        </Text>
        <Text fz={30} fw={600} lh={1.1} c={color}>
          {value}
        </Text>
        {hint && (
          <Text size="xs" c="dimmed" component="div">
            {hint}
          </Text>
        )}
        {children && (
          <Stack gap={8} mt={12}>
            {children}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

/** Ligne « libellé … valeur » du détail d'une carte. */
export function KpiLine({
  name,
  value,
  color,
}: {
  name: ReactNode;
  value: string;
  color?: string;
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed" component="div">
        {name}
      </Text>
      <Text size="sm" fw={600} c={color}>
        {value}
      </Text>
    </Group>
  );
}
