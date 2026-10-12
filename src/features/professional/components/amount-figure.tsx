import { Group, Stack, Text } from '@mantine/core'
import type { ForecastActual } from '@server/lib/professional/types'

import { DeltaBadge } from '@/components/delta-badge'
import { InfoTip } from '@/components/info-tip'
import type { GaugeGoal } from '@/components/target-gauge'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

interface AmountFigureProps {
  amount: ForecastActual
  /** Couleur du chiffre (token Mantine). */
  color?: string
  /** Sens de l'écart réel − prévu (voir `DeltaBadge`) ; sans `goal`, pas de pastille d'écart. */
  goal?: GaugeGoal
  label: string
  size?: 'md' | 'lg'
  tip: string
}

/**
 * Un chiffre du dashboard Pro : libellé + info-bulle, valeur (réelle, sinon prévue) puis « prévu X »
 * et l'écart, ou « prévisionnel » pour un mois à venir.
 */
export function AmountFigure({
  label,
  tip,
  amount,
  goal,
  color,
  size = 'md',
}: AmountFigureProps) {
  const isForecast = amount.actual === null
  return (
    <Stack gap={2}>
      <Group gap={4} wrap="nowrap">
        <Text c="dimmed" size="sm">
          {label}
        </Text>
        <InfoTip ariaLabel={fr.professional.howComputed(label)} label={tip} />
      </Group>
      <Text
        c={isForecast ? 'dimmed' : color}
        fw={size === 'lg' ? 600 : 700}
        fz={size === 'lg' ? 26 : 18}
      >
        {formatCents(amount.actual ?? amount.forecast)}
      </Text>
      <Group gap={6}>
        <Text c="dimmed" size="xs">
          {isForecast
            ? fr.professional.forecastOnly
            : fr.professional.forecastSub(formatCents(amount.forecast))}
        </Text>
        {goal && amount.actual !== null && (
          <DeltaBadge
            actual={amount.actual}
            forecast={amount.forecast}
            goal={goal}
          />
        )}
      </Group>
    </Stack>
  )
}
