import { Badge, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { DeltaBadge } from "@/components/delta-badge";
import { InfoTip } from "@/components/info-tip";
import { TargetGauge } from "@/components/target-gauge";
import { formatCents, formatHalfDays } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ClientBilling, InvoiceStatus, ProMonth } from "@server/lib/pro/types";

const STATUS_COLOR = {
  TO_INVOICE: "gray",
  NOT_INVOICED: "gray",
  PENDING: "red",
  PAID: "teal",
} as const satisfies Record<InvoiceStatus, string>;

/** TJM moyen d'une ligne (centimes) : montant / jours. */
const dailyRate = (line: { halfDays: number; amountCents: number }) =>
  line.halfDays > 0 ? Math.round((line.amountCents * 2) / line.halfDays) : 0;

const calc = (line: { halfDays: number; amountCents: number }) =>
  [formatHalfDays(line.halfDays), formatCents(dailyRate(line))] as const;

/**
 * « Facturation & encaissements » : une ligne par client, jours × TJM réels (saisis) vs prévus,
 * HT et écart, statut de la facture (rapprochée des encaissements du relevé pro).
 */
export function BillingCard({ month, action }: { month: ProMonth; action?: ReactNode }) {
  const text = fr.professional.billing;
  const clients = month.billing.clients;

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Group justify="space-between" mb={16}>
        <Title order={2}>{text.title}</Title>
        {action}
      </Group>
      {clients.length === 0 ? (
        <Text c="dimmed">{text.empty}</Text>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="md" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{text.columns.client}</Table.Th>
                <Table.Th>{text.columns.calc}</Table.Th>
                <Table.Th>
                  <Group gap={4} wrap="nowrap">
                    {text.columns.amount}
                    <InfoTip
                      label={text.amountTip}
                      ariaLabel={fr.professional.howComputed(text.columns.amount)}
                    />
                  </Group>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {clients.map((client) => (
                <ClientRow key={client.clientId} client={client} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Paper>
  );
}

function ClientRow({ client }: { client: ClientBilling }) {
  const text = fr.professional.billing;
  const shown = client.actual ?? client.forecast;

  return (
    <Table.Tr>
      <Table.Td>
        <Group gap={8}>
          <Text fw={600}>{client.clientName}</Text>
          <Badge variant="light" color={STATUS_COLOR[client.status]} tt="none">
            {text.status[client.status]}
          </Badge>
        </Group>
        {client.actual && client.ttcCents > 0 && (
          <Text size="xs" c="dimmed">
            {text.ttc(formatCents(client.ttcCents))} ·{" "}
            {text.collected(formatCents(client.paidCents))}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={600}>
          {text.calc(...calc(shown))}
        </Text>
        {client.actual && (
          <Text size="xs" c="dimmed">
            {text.forecastCalc(...calc(client.forecast))}
          </Text>
        )}
      </Table.Td>
      <Table.Td miw={220}>
        <Stack gap={6}>
          <Group gap={8} wrap="nowrap">
            <Text fw={600} c={client.actual ? undefined : "dimmed"}>
              {formatCents(shown.amountCents)}
            </Text>
            <Text size="xs" c="dimmed">
              {fr.professional.forecastSub(formatCents(client.forecast.amountCents))}
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
            real={client.actual?.amountCents ?? null}
            target={client.forecast.amountCents}
            goal="atLeast"
            ariaLabel={text.gaugeAria(
              client.clientName,
              formatCents(client.actual?.amountCents ?? 0),
              formatCents(client.forecast.amountCents),
            )}
          />
        </Stack>
      </Table.Td>
    </Table.Tr>
  );
}
