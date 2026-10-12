import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

import { InfoTip } from '@/components/info-tip'
import { ApartmentTable } from '@/features/apartments/components/apartment-table'
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

/** Carte d'un appartement : en-tête, jauge de capital remboursé, facture de gérance (bien géré, mois clos) et tableau. */
export function ApartmentCard({ apartment, period }: ApartmentCardProps) {
  const text = fr.apartments.card
  const managed = apartment.managerName !== null
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
              {managed
                ? text.managedBy(apartment.managerName ?? '')
                : text.direct}
              {' · '}
              {text.acquired(
                monthName(apartment.acquiredAt.getUTCMonth() + 1),
                apartment.acquiredAt.getUTCFullYear(),
                formatCents(apartment.priceCents),
              )}
            </Text>
          </div>
          <Button
            component={Link}
            size="compact-sm"
            to="/settings?tab=apt"
            variant="default"
          >
            {fr.apartments.settings}
          </Button>
        </Group>

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

        {managed && period.month !== null && apartment.closedMonths > 0 && (
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
