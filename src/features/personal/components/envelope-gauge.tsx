import { Group, Text } from '@mantine/core'

import { InfoTip } from '@/components/info-tip'
import { TargetGauge } from '@/components/target-gauge'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

interface EnvelopeGaugeProps {
  /** Dépense : « bien » si on reste sous le recommandé. Épargne : « bien » si on l'atteint. */
  kind: 'expense' | 'savings'
  name: string
  realCents: number
  recommendedCents: number
  /** Part recommandée du revenu (en %), pour expliquer le trait dans le tooltip. */
  recommendedPercent: number
  /** D'où vient le montant réel (liste des catégories comptées). */
  sourceText: string
}

/** Jauge d'une enveloppe : nom + info-bulle, réel / recommandé, barre réel vs recommandé. */
export function EnvelopeGauge({
  name,
  realCents,
  recommendedCents,
  recommendedPercent,
  sourceText,
  kind,
}: EnvelopeGaugeProps) {
  return (
    <div>
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Group gap={4} wrap="nowrap">
          <Text c="dimmed" size="sm">
            {name}
          </Text>
          <InfoTip
            ariaLabel={fr.personal.gauge.howComputed(name)}
            label={fr.personal.gauge.tooltip(sourceText, recommendedPercent)}
          />
        </Group>
        <Text fw={600} size="sm">
          {formatCents(realCents)}
          <Text c="dimmed" fw={400} size="xs" span>
            {' '}
            / {formatCents(recommendedCents)}
          </Text>
        </Text>
      </Group>
      <TargetGauge
        ariaLabel={fr.personal.gauge.aria(
          name,
          formatCents(realCents),
          formatCents(recommendedCents),
        )}
        goal={kind === 'savings' ? 'atLeast' : 'atMost'}
        real={realCents}
        target={recommendedCents}
      />
    </div>
  )
}
