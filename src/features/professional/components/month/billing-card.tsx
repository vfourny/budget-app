import {
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import type {
  ClientBilling,
  ProfessionalMonth,
} from '@server/lib/professional/types'
import { averageDailyRate } from '@shared/professional/billing-days'
import type { ReactNode } from 'react'

import { DeltaBadge } from '@/components/delta-badge'
import { InfoTip } from '@/components/info-tip'
import { TargetGauge } from '@/components/target-gauge'
import { formatCents, formatDays } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

/** TJM moyen d'une ligne (centimes) : montant / jours. */
const dailyRate = (line: { days: number; amountCents: number }) =>
  averageDailyRate(line.amountCents, line.days)

const calc = (line: { days: number; amountCents: number }) =>
  [formatDays(line.days), formatCents(dailyRate(line))] as const

/**
 * « Facturation & encaissements » : une ligne par client, jours × TJM réels (saisis) vs prévus,
 * HT et écart ; en bas, facturé TTC, encaissé dans le mois (catégorie « Encaissement client ») et
 * reste à encaisser cumulé (les clients paient 1 à 2 mois plus tard).
 */
export function BillingCard({
  month,
  action,
}: {
  month: ProfessionalMonth
  action?: ReactNode
}) {
  const text = fr.professional.billing
  const clients = month.billing.clients

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Group justify="space-between" mb={16}>
        <Title order={2}>{text.title}</Title>
        {action}
      </Group>
      {clients.length === 0 ? (
        <Text c="dimmed">{text.empty}</Text>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table horizontalSpacing="md" verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{text.columns.client}</Table.Th>
                <Table.Th>{text.columns.calc}</Table.Th>
                <Table.Th>
                  <Group gap={4} wrap="nowrap">
                    {text.columns.amount}
                    <InfoTip
                      ariaLabel={fr.professional.howComputed(
                        text.columns.amount,
                      )}
                      label={text.amountTip}
                    />
                  </Group>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {clients.map((client) => (
                <ClientRow client={client} key={client.clientName} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Collections month={month} />
    </Paper>
  )
}

function ClientRow({ client }: { client: ClientBilling }) {
  const text = fr.professional.billing
  const shown = client.actual ?? client.forecast

  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={600}>{client.clientName}</Text>
        {client.ttcCents > 0 && (
          <Text c="dimmed" size="xs">
            {client.actual
              ? text.ttc(formatCents(client.ttcCents))
              : text.forecastTtc(formatCents(client.ttcCents))}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text fw={600} size="sm">
          {text.calc(...calc(shown))}
        </Text>
        {client.actual && (
          <Text c="dimmed" size="xs">
            {text.forecastCalc(...calc(client.forecast))}
          </Text>
        )}
      </Table.Td>
      <Table.Td miw={220}>
        <Stack gap={6}>
          <Group gap={8} wrap="nowrap">
            <Text c={client.actual ? undefined : 'dimmed'} fw={600}>
              {formatCents(shown.amountCents)}
            </Text>
            <Text c="dimmed" size="xs">
              {fr.professional.forecastSub(
                formatCents(client.forecast.amountCents),
              )}
            </Text>
            {client.actual && (
              <DeltaBadge
                actual={client.actual.amountCents}
                forecast={client.forecast.amountCents}
                goal="atLeast"
              />
            )}
          </Group>
          <TargetGauge
            ariaLabel={text.gaugeAria(
              client.clientName,
              formatCents(client.actual?.amountCents ?? 0),
              formatCents(client.forecast.amountCents),
            )}
            goal="atLeast"
            real={client.actual?.amountCents ?? null}
            target={client.forecast.amountCents}
          />
        </Stack>
      </Table.Td>
    </Table.Tr>
  )
}

/** Bas de carte : facturé TTC du mois, encaissé dans le mois, reste à encaisser cumulé. */
function Collections({ month }: { month: ProfessionalMonth }) {
  const text = fr.professional.billing.collections
  const { billing } = month
  const receivables = billing.receivablesCents

  return (
    <SimpleGrid
      cols={{ base: 1, sm: 3 }}
      mt={16}
      pt={16}
      spacing={16}
      style={{ borderTop: '1px solid var(--app-border)' }}
    >
      <div>
        <Text c="dimmed" size="xs">
          {month.hasActual ? text.invoiced : text.toInvoice}
        </Text>
        <Text fw={600}>{formatCents(billing.invoicedTtcCents)}</Text>
      </div>
      <div>
        <Text c="dimmed" size="xs">
          {text.collected}
        </Text>
        <Text c={month.hasActual ? 'teal.4' : 'dimmed'} fw={600}>
          {month.hasActual ? formatCents(billing.collectedTtcCents) : '—'}
        </Text>
      </div>
      <div>
        <Group gap={4} wrap="nowrap">
          <Text c="dimmed" size="xs">
            {text.receivables}
          </Text>
          <InfoTip
            ariaLabel={fr.professional.howComputed(text.receivables)}
            label={text.receivablesTip}
          />
        </Group>
        <Text c={receivables ? 'red.4' : 'dimmed'} fw={600}>
          {receivables === null ? '—' : formatCents(receivables)}
        </Text>
      </div>
    </SimpleGrid>
  )
}
