import { Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

import { InfoTip } from "@/components/info-tip";
import { ApartmentTable } from "@/features/apartments/components/apartment-table";
import { LoanGauge } from "@/features/apartments/components/loan-gauge";
import { ManagementInvoiceForm } from "@/features/apartments/components/management-invoice-form";
import { formatBp, formatCents, monthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { RouterOutputs } from "@/lib/trpc";

type ApartmentView = RouterOutputs["apartmentDashboard"]["month"]["apartments"][number];

interface ApartmentCardProps {
  apartment: ApartmentView;
  /** Période affichée : `month: null` en vue année. La facture de gérance se saisit en vue mois. */
  period: { year: number; month: number | null };
}

/** Carte d'un appartement : en-tête, jauge de capital remboursé, facture de gérance (bien géré, mois clos) et tableau. */
export function ApartmentCard({ apartment, period }: ApartmentCardProps) {
  const text = fr.apartments.card;
  const managed = apartment.managerName !== null;
  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={apartment.name}>
      <Stack gap={20}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Group gap={10}>
              <Title order={2}>{apartment.name}</Title>
              <Badge variant="light" color="gold">
                {fr.apartmentKinds[apartment.kind]}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {managed ? text.managedBy(apartment.managerName ?? "") : text.direct}
              {" · "}
              {text.acquired(
                monthName(apartment.acquiredAt.getUTCMonth() + 1),
                apartment.acquiredAt.getUTCFullYear(),
                formatCents(apartment.priceCents),
              )}
            </Text>
          </div>
          <Button component={Link} to="/settings?tab=apt" variant="default" size="compact-sm">
            {fr.apartments.settings}
          </Button>
        </Group>

        {apartment.capital && (
          <LoanGauge
            repaidCents={apartment.capital.repaidCents}
            principalCents={apartment.capital.principalCents}
          />
        )}

        {apartment.yields && (
          <Group gap={8}>
            <Badge variant="light" color="teal" tt="none">
              {text.grossYield} {formatBp(apartment.yields.grossBps)} %
            </Badge>
            <Badge variant="light" color="teal" tt="none">
              {text.netYield} {formatBp(apartment.yields.netBps)} %
            </Badge>
            <InfoTip label={text.yieldTip} ariaLabel={text.yieldTipAria(text.netYield)} />
          </Group>
        )}

        {managed && period.month !== null && apartment.closedMonths > 0 && (
          <ManagementInvoiceForm
            key={`${apartment.id}-${period.year}-${period.month}`}
            apartmentId={apartment.id}
            year={period.year}
            month={period.month}
            invoice={apartment.invoice}
          />
        )}

        <ApartmentTable apartment={apartment} view={period.month === null ? "year" : "month"} />
      </Stack>
    </Paper>
  );
}
