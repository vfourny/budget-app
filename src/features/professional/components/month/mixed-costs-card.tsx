import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type {
  MixedCostRow,
  ProfessionalMonth,
} from '@server/lib/professional/professional.type'
import { MIXED_COSTS_RATIO } from '@shared/professional/professional.rules'

import { InfoTip } from '@/components/info-tip'
import { TargetGauge } from '@/components/target-gauge'
import { formatBp, formatCents, formatSquareMeters } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

type Status = keyof typeof fr.professional.mixedCosts.status

const STATUS_COLOR = {
  forecast: 'gray',
  paid: 'teal',
  partial: 'red',
  toRefund: 'red',
} as const satisfies Record<Status, string>

function statusOf(row: MixedCostRow): Status {
  if (row.paidCents === null) return 'forecast'
  const due = row.due.actual ?? 0
  if (row.paidCents >= due) return 'paid'
  return row.paidCents > 0 ? 'partial' : 'toRefund'
}

/**
 * « Frais mixtes perso → pro » : loyer, internet, téléphone, énergie payés en perso ; part due par
 * Stygma (prorata surface ou clé n/d) et remboursements reçus, ligne par ligne.
 */
export function MixedCostsCard({ month }: { month: ProfessionalMonth }) {
  const text = fr.professional.mixedCosts
  const { settings } = month
  const areaShare =
    month.mixedCosts.rows.find((row) => row.allocation === 'area')?.shareBp ?? 0
  const areaText = text.areaKey(
    formatSquareMeters(settings.officeAreaDm2),
    formatSquareMeters(settings.homeAreaDm2),
    formatBp(areaShare),
  )
  const ratioText = text.ratioKey(
    MIXED_COSTS_RATIO.numerator,
    MIXED_COSTS_RATIO.denominator,
  )
  const left = month.mixedCosts.leftToRefundCents

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Group gap={4} wrap="nowrap">
        <Title order={2}>{text.title}</Title>
        <InfoTip
          ariaLabel={fr.professional.howComputed(text.title)}
          label={text.tip(areaText, ratioText)}
        />
      </Group>
      <Text c="dimmed" mb={16} size="sm">
        {text.description}
      </Text>
      <Stack gap={14}>
        {month.mixedCosts.rows.map((row) => {
          const status = statusOf(row)
          const label = fr.categories[row.category]
          const due = row.due.actual ?? row.due.forecast
          const key = row.allocation === 'area' ? areaText : ratioText
          return (
            <div key={row.category}>
              <Group justify="space-between" mb={4} wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">{label}</Text>
                  <InfoTip
                    ariaLabel={fr.professional.howComputed(label)}
                    label={text.lineTip(
                      formatCents(row.spent.actual ?? row.spent.forecast),
                      formatCents(due),
                      key,
                    )}
                  />
                  {/* Rien à rembourser (pas de dépense ce mois-ci) : pas de statut. */}
                  {due > 0 && (
                    <Badge
                      color={STATUS_COLOR[status]}
                      size="sm"
                      tt="none"
                      variant="light"
                    >
                      {text.status[status]}
                    </Badge>
                  )}
                </Group>
                <Text fw={600} size="sm">
                  {row.paidCents === null
                    ? text.forecastDue(formatCents(due))
                    : text.paidOfDue(
                        formatCents(row.paidCents),
                        formatCents(due),
                      )}
                </Text>
              </Group>
              <TargetGauge
                ariaLabel={text.gaugeAria(
                  label,
                  formatCents(row.paidCents ?? 0),
                  formatCents(due),
                )}
                goal="atLeast"
                real={row.paidCents}
                target={due}
              />
            </div>
          )
        })}
      </Stack>
      <Group
        justify="space-between"
        mt={20}
        pt={12}
        style={{ borderTop: '1px solid var(--app-border)' }}
      >
        <Text c="dimmed" size="sm">
          {text.left}
        </Text>
        <Text c={month.hasActual && left > 0 ? 'red.4' : 'teal.4'} fw={700}>
          {formatCents(left)}
        </Text>
      </Group>
    </Paper>
  )
}
