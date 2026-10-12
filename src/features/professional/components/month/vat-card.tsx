import { Group, Paper, Progress, Stack, Text } from '@mantine/core'
import type {
  ForecastActual,
  ProfessionalMonth,
} from '@server/lib/professional/types'

import { InfoTip } from '@/components/info-tip'
import { AmountFigure } from '@/features/professional/components/amount-figure'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** Carte « TVA à reverser » : collectée − déductible = à reverser, prévu vs réel. */
export function VatCard({ month }: { month: ProfessionalMonth }) {
  const { vat } = month
  const text = fr.professional.vat
  const shown = (amount: ForecastActual) => amount.actual ?? amount.forecast
  const scale = Math.max(vat.collected.forecast, shown(vat.collected), 1)

  const lines = [
    {
      label: text.collected,
      tip: text.collectedTip,
      amount: vat.collected,
      goal: 'atLeast',
      color: 'gold',
    },
    {
      label: text.deductible,
      tip: text.deductibleTip,
      amount: vat.deductible,
      goal: 'atLeast',
      color: 'blue',
    },
    {
      label: text.due,
      tip: text.dueTip,
      amount: vat.due,
      goal: 'atMost',
      color: 'gray',
    },
  ] as const

  return (
    <Paper h="100%" p={24} radius="lg" withBorder>
      <Stack gap={16}>
        <div>
          <Group gap={4}>
            <Text c="dimmed" size="sm">
              {text.title}
            </Text>
            <InfoTip
              ariaLabel={fr.professional.howComputed(text.title)}
              label={text.tip}
            />
          </Group>
          <Text
            c={vat.due.actual === null ? 'dimmed' : undefined}
            fw={600}
            fz={30}
            lh={1.1}
          >
            {formatCents(shown(vat.due))}
          </Text>
        </div>
        {lines.map((line) => (
          <Stack gap={6} key={line.label}>
            <AmountFigure
              amount={line.amount}
              goal={line.goal}
              label={line.label}
              tip={line.tip}
            />
            <Progress
              aria-hidden
              color={line.color}
              size="sm"
              value={(Math.max(0, shown(line.amount)) / scale) * 100}
            />
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}
