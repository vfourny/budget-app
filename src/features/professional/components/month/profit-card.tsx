import {
  Divider,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import type {
  ForecastActual,
  ProfessionalMonth,
} from '@shared/professional/professional.type'

import { InfoTip } from '@/components/info-tip'
import { AmountFigure } from '@/features/professional/components/amount-figure'
import { formatBp, formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/**
 * Carte « Bénéfice » : équation CA HT − charges − salaires − cotisations = bénéfice, barre de
 * répartition du CA, puis bénéfice − BNC prélevés = reste en trésorerie, et charges sociales.
 */
export function ProfitCard({ month }: { month: ProfessionalMonth }) {
  const text = fr.professional.profit
  const shown = (amount: ForecastActual) => amount.actual ?? amount.forecast

  // Barre empilée : chaque poste ÷ CA HT (le bénéfice négatif n'a pas de segment).
  const segments = [
    {
      key: 'charges',
      label: text.charges,
      amount: month.charges.total,
      color: 'blue.3',
    },
    {
      key: 'salary',
      label: text.salary,
      amount: month.remuneration.grossSalary,
      color: 'var(--mantine-color-dimmed)',
    },
    {
      key: 'employer',
      label: text.employer,
      amount: month.remuneration.employerContributions,
      color: 'var(--mantine-color-text)',
    },
    {
      key: 'profit',
      label: fr.professional.profit.title,
      amount: month.profit,
      color: 'gold.6',
    },
  ]
  const total = Math.max(
    shown(month.revenue),
    segments.reduce(
      (sum, segment) => sum + Math.max(0, shown(segment.amount)),
      0,
    ),
    1,
  )

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Stack gap={20}>
        <Group gap={4}>
          <Text c="dimmed" size="sm">
            {text.title}
          </Text>
          <InfoTip
            ariaLabel={fr.professional.howComputed(text.title)}
            label={text.tip}
          />
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing={16}>
          <AmountFigure
            amount={month.revenue}
            goal="atLeast"
            label={text.revenue}
            tip={text.revenueTip}
          />
          <AmountFigure
            amount={month.charges.total}
            goal="atMost"
            label={text.charges}
            tip={text.chargesTip}
          />
          <AmountFigure
            amount={month.remuneration.grossSalary}
            label={text.salary}
            tip={text.salaryTip}
          />
          <AmountFigure
            amount={month.remuneration.employerContributions}
            label={text.employer}
            tip={text.employerTip}
          />
          <AmountFigure
            amount={month.profit}
            color="gold.6"
            goal="atLeast"
            label={text.title}
            size="lg"
            tip={text.profitTip}
          />
        </SimpleGrid>

        {/* Barre empilée : un `Progress.Section` par poste (≈ plusieurs segments dans une jauge). */}
        <Progress.Root
          aria-label={text.splitAria}
          bg="var(--app-hover)"
          radius={5}
          role="img"
          size={10}
        >
          {segments.map((segment) => (
            <Tooltip
              key={segment.key}
              label={`${segment.label} : ${formatCents(shown(segment.amount))}`}
            >
              <Progress.Section
                color={segment.color}
                // Poste encore prévisionnel (pas de réel) : segment estompé.
                opacity={segment.amount.actual === null ? 0.45 : undefined}
                value={(Math.max(0, shown(segment.amount)) / total) * 100}
                withAria={false}
              />
            </Tooltip>
          ))}
        </Progress.Root>

        <Stack gap={16}>
          <Divider color="var(--app-border)" />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={16}>
            <AmountFigure
              amount={month.remuneration.bncWithdrawal}
              label={text.bnc}
              tip={text.bncTip}
            />
            <AmountFigure
              amount={month.retained}
              color="teal.4"
              goal="atLeast"
              label={text.retained}
              tip={text.retainedTip}
            />
            <Stack gap={2}>
              <AmountFigure
                amount={month.profitSocialCharges}
                color="red.4"
                label={text.socialCharges}
                tip={text.socialChargesTip}
              />
              <Text c="dimmed" size="xs">
                {text.socialChargesSub(
                  formatBp(month.settings.profitSocialChargesBp),
                )}
              </Text>
            </Stack>
          </SimpleGrid>
        </Stack>
      </Stack>
    </Paper>
  )
}
