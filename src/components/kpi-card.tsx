import { Group, Paper, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

interface KpiCardProps {
  children?: ReactNode
  /** Couleur du chiffre (token Mantine, ex. `"gold.6"`). */
  color?: string
  hint?: ReactNode
  label: ReactNode
  value: string
}

/** Carte d'indicateur : libellé, grand chiffre, aide, puis un détail optionnel (lignes, jauges). */
export function KpiCard({ label, value, hint, color, children }: KpiCardProps) {
  return (
    <Paper h="100%" p={24} radius="lg" withBorder>
      <Stack gap={6}>
        <Text c="dimmed" component="div" size="sm">
          {label}
        </Text>
        <Text c={color} fw={600} fz={30} lh={1.1}>
          {value}
        </Text>
        {hint && (
          <Text c="dimmed" component="div" size="xs">
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
  )
}

/** Ligne « libellé … valeur » du détail d'une carte. */
export function KpiLine({
  name,
  value,
  color,
}: {
  name: ReactNode
  value: string
  color?: string
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text c="dimmed" component="div" size="sm">
        {name}
      </Text>
      <Text c={color} fw={600} size="sm">
        {value}
      </Text>
    </Group>
  )
}
