import { Anchor, Grid } from '@mantine/core'
import type { Envelope } from '@server/generated/prisma/enums'
import type { PeriodTotals } from '@server/lib/dashboard/aggregate'
import { isSavingsEnvelope, SAVINGS_ENVELOPES } from '@shared/personal-rules'
import { Link } from 'react-router'

import { KpiCard, KpiLine } from '@/components/kpi-card'
import { EnvelopeGauge } from '@/features/personal/components/envelope-gauge'
import { useEnvelopeShares } from '@/features/settings/hooks/use-envelope-shares'
import { useIncomeTaxBrackets } from '@/features/settings/hooks/use-income-tax-brackets'
import { ENVELOPE_ORDER, envelopeSourceText } from '@/lib/envelopes'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import { estimateIncomeTaxCents } from '@/lib/income-tax'

type Overview = PeriodTotals & { monthsWithData: number }

/** Enveloppes de dépense = toutes sauf l'épargne (voir `SAVINGS_ENVELOPES` dans personal-rules). */
const EXPENSE_ENVELOPES = ENVELOPE_ORDER.filter(
  (envelope) => !isSavingsEnvelope(envelope),
)

export function KpiCards({
  view,
  year,
  overview,
}: {
  view: 'month' | 'year'
  year: number
  overview: Overview
}) {
  // Sans les parts (chargement / erreur), les cartes restent utiles : on affiche le réel seul.
  const shares = useEnvelopeShares().data
  const months = Math.max(1, overview.monthsWithData)
  const savingsRate =
    overview.revenueCents > 0
      ? Math.round((overview.savingsCents / overview.revenueCents) * 100)
      : 0

  function gauges(envelopes: readonly Envelope[], kind: 'expense' | 'savings') {
    // Toutes les enveloppes sont affichées, même à 0 € : on veut voir la jauge et le conseillé.
    return envelopes.map((envelope) => {
      const realCents = overview.byEnvelope[envelope]
      if (!shares) {
        return (
          <KpiLine
            key={envelope}
            name={fr.envelopes[envelope]}
            value={formatCents(realCents)}
          />
        )
      }
      return (
        <EnvelopeGauge
          key={envelope}
          kind={kind}
          name={fr.envelopes[envelope]}
          realCents={realCents}
          recommendedCents={Math.round(
            (overview.revenueCents * shares[envelope]) / 100,
          )}
          recommendedPercent={shares[envelope]}
          sourceText={envelopeSourceText(envelope)}
        />
      )
    })
  }

  // Vue année : 5 cartes sur 2 lignes (3 + 2). Vue mois : 3 cartes sur 1 ligne.
  const topSpan = { base: 12, md: 4 }
  const bottomSpan = { base: 12, md: 6 }
  // IR estimé sur le revenu annualisé (cumul / mois avec données × 12), valeur dérivée au rendu.
  const brackets = useIncomeTaxBrackets(year)
  const annualRevenueCents = Math.round((overview.revenueCents / months) * 12)

  return (
    <Grid align="stretch" gap={16} mb={16}>
      <Grid.Col span={topSpan}>
        <KpiCard
          color="blue.3"
          hint={fr.personal.kpi.revenuesHint}
          label={fr.common.revenues}
          value={formatCents(overview.revenueCents)}
        >
          {overview.revenueLines.map((line) => (
            <KpiLine
              key={line.key}
              name={fr.revenueLines[line.key]}
              value={formatCents(line.cents)}
            />
          ))}
        </KpiCard>
      </Grid.Col>
      <Grid.Col span={topSpan}>
        <KpiCard
          hint={fr.personal.kpi.expensesHint}
          label={
            view === 'month'
              ? fr.personal.kpi.expensesMonth
              : fr.personal.kpi.expensesYear
          }
          value={formatCents(overview.expenseCents)}
        >
          {gauges(EXPENSE_ENVELOPES, 'expense')}
        </KpiCard>
      </Grid.Col>
      <Grid.Col span={topSpan}>
        <KpiCard
          color="gold.6"
          hint={fr.personal.kpi.savingsHint(savingsRate)}
          label={
            view === 'month'
              ? fr.personal.kpi.savingsMonth
              : fr.personal.kpi.savingsYear
          }
          value={formatCents(overview.savingsCents)}
        >
          {gauges(SAVINGS_ENVELOPES, 'savings')}
        </KpiCard>
      </Grid.Col>
      {view === 'year' && (
        <>
          <Grid.Col span={bottomSpan}>
            <KpiCard
              hint={fr.personal.kpi.monthsWithData(overview.monthsWithData)}
              label={fr.personal.kpi.averageExpense}
              value={formatCents(Math.round(overview.expenseCents / months))}
            />
          </Grid.Col>
          <Grid.Col span={bottomSpan}>
            {brackets.data && brackets.data.length > 0 ? (
              <KpiCard
                color="blue.3"
                hint={fr.personal.kpi.incomeTaxHint}
                label={fr.personal.kpi.incomeTax(year)}
                value={formatCents(
                  estimateIncomeTaxCents(annualRevenueCents, brackets.data),
                )}
              />
            ) : (
              <KpiCard
                color="blue.3"
                hint={
                  brackets.isError
                    ? fr.personal.kpi.incomeTaxLoadFailed
                    : brackets.isSuccess
                      ? fr.personal.kpi.incomeTaxMissing(year)
                      : ''
                }
                label={fr.personal.kpi.incomeTax(year)}
                value={brackets.isPending ? '…' : '—'}
              >
                {brackets.isSuccess && (
                  <Anchor c="amber.4" component={Link} size="sm" to="/settings">
                    {fr.personal.kpi.incomeTaxMissingLink}
                  </Anchor>
                )}
              </KpiCard>
            )}
          </Grid.Col>
        </>
      )}
    </Grid>
  )
}
