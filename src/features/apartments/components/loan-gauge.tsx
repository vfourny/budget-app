import { Group, Progress, Text } from '@mantine/core'

import { formatBp, formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** Jauge « Capital remboursé » : « 15 368 € sur 166 357 € · 9,2 % » (d'après le tableau d'amortissement, R6). */
export function LoanGauge({
  repaidCents,
  principalCents,
}: {
  repaidCents: number
  principalCents: number
}) {
  const text = fr.apartments.card
  const ratio = principalCents > 0 ? repaidCents / principalCents : 0
  const percent = formatBp(Math.round(ratio * 10_000))
  return (
    <div>
      <Group gap={12} justify="space-between" mb={6}>
        <Text c="dimmed" size="sm">
          {text.capitalRepaid}
        </Text>
        <Text fw={600} size="sm">
          {text.capitalOf(
            formatCents(repaidCents),
            formatCents(principalCents),
            percent,
          )}
        </Text>
      </Group>
      <Progress
        aria-label={text.capitalAria(percent)}
        color="gold"
        size="sm"
        value={ratio * 100}
      />
    </div>
  )
}
