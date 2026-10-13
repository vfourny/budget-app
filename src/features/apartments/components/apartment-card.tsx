import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { Link } from 'react-router'

import { InfoTip } from '@/components/info-tip'
import { ApartmentTable } from '@/features/apartments/components/apartment-table'
import { ForecastEditorModal } from '@/features/apartments/components/forecast-editor-modal'
import { LoanGauge } from '@/features/apartments/components/loan-gauge'
import { ManagementInvoiceForm } from '@/features/apartments/components/management-invoice-form'
import { formatBp, formatCents, monthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

type ApartmentView =
  RouterOutputs['apartmentDashboard']['month']['apartments'][number]

interface ApartmentCardProps {
  apartment: ApartmentView
  /** Période affichée : `month: null` en vue année. La facture de gérance se saisit en vue mois. */
  period: { year: number; month: number | null }
}

/**
 * Mois ouvert par l'éditeur du prévisionnel : le mois affiché ; en vue année, janvier (le mois en
 * cours pour l'année en cours), jamais avant l'acquisition.
 */
function editorMonth(
  period: ApartmentCardProps['period'],
  acquiredAt: Date,
): { year: number; month: number } {
  const now = new Date()
  const month =
    period.month ??
    (period.year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 1)
  const acquired = {
    year: acquiredAt.getUTCFullYear(),
    month: acquiredAt.getUTCMonth() + 1,
  }
  return period.year * 12 + month < acquired.year * 12 + acquired.month
    ? acquired
    : { year: period.year, month }
}

/** Carte d'un appartement : en-tête, jauge de capital remboursé, facture de gérance (bien géré, mois clos) et tableau. */
export function ApartmentCard({ apartment, period }: ApartmentCardProps) {
  const text = fr.apartments.card
  const [editing, setEditing] = useState(false)
  return (
    <Paper
      aria-label={apartment.name}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Stack gap={20}>
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <div>
            <Group gap={10}>
              <Title order={2}>{apartment.name}</Title>
              <Badge color="gold" variant="light">
                {fr.apartmentKinds[apartment.kind]}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">
              {apartment.managed ? text.managed : text.direct}
              {' · '}
              {text.acquired(
                monthName(apartment.acquiredAt.getUTCMonth() + 1),
                apartment.acquiredAt.getUTCFullYear(),
                formatCents(apartment.priceCents),
              )}
            </Text>
          </div>
          <Group gap={8} wrap="nowrap">
            <Button
              onClick={() => setEditing(true)}
              size="compact-sm"
              variant="default"
            >
              {fr.apartments.editor.open}
            </Button>
            <Button
              component={Link}
              size="compact-sm"
              to="/settings?tab=apt"
              variant="default"
            >
              {fr.apartments.settings}
            </Button>
          </Group>
        </Group>
        {/* Rendue seulement ouverte : chaque ouverture repart du mois affiché (≈ `v-if`). */}
        {editing && (
          <ForecastEditorModal
            apartment={apartment}
            initial={editorMonth(period, apartment.acquiredAt)}
            onClose={() => setEditing(false)}
          />
        )}

        {apartment.capital && (
          <LoanGauge
            principalCents={apartment.capital.principalCents}
            repaidCents={apartment.capital.repaidCents}
          />
        )}

        {apartment.yields && (
          <Group gap={8}>
            <Badge color="teal" tt="none" variant="light">
              {text.grossYield} {formatBp(apartment.yields.grossBps)} %
            </Badge>
            <Badge color="teal" tt="none" variant="light">
              {text.netYield} {formatBp(apartment.yields.netBps)} %
            </Badge>
            <InfoTip
              ariaLabel={text.yieldTipAria(text.netYield)}
              label={text.yieldTip}
            />
          </Group>
        )}

        {apartment.managed &&
          period.month !== null &&
          apartment.closedMonths > 0 && (
            <ManagementInvoiceForm
              apartmentId={apartment.id}
              invoice={apartment.invoice}
              key={`${apartment.id}-${period.year}-${period.month}`}
              month={period.month}
              year={period.year}
            />
          )}

        <ApartmentTable
          apartment={apartment}
          view={period.month === null ? 'year' : 'month'}
        />
      </Stack>
    </Paper>
  )
}
