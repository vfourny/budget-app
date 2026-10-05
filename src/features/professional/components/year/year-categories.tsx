import { Paper, Text, Title } from "@mantine/core";

import {
  ForecastTable,
  type ForecastTableGroup,
  type ForecastRow,
} from "@/features/professional/components/forecast-table";
import { formatCents, monthName } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ForecastActual, ProfessionalMonth } from "@server/lib/professional/types";
import type { TransactionCategory } from "@server/generated/prisma/enums";

/**
 * Cumul d'un poste sur l'année : prévu et réel sur les mois avec réel (comparables), + le prévu
 * de toute l'année en sous-titre.
 */
function cumulate(
  months: readonly ProfessionalMonth[],
  pick: (month: ProfessionalMonth) => ForecastActual,
) {
  const actualMonths = months.filter((month) => month.hasActual);
  const amount: ForecastActual = {
    forecast: actualMonths.reduce((total, month) => total + pick(month).forecast, 0),
    actual:
      actualMonths.length > 0
        ? actualMonths.reduce((total, month) => total + (pick(month).actual ?? 0), 0)
        : null,
  };
  const yearForecast = months.reduce((total, month) => total + pick(month).forecast, 0);
  return { amount, sub: fr.professional.year.categories.yearForecast(formatCents(yearForecast)) };
}

function row(
  key: string,
  label: string,
  months: readonly ProfessionalMonth[],
  pick: (month: ProfessionalMonth) => ForecastActual,
  tone?: ForecastRow["tone"],
): ForecastRow {
  return { key, label, goal: "atMost", tone, ...cumulate(months, pick) };
}

/** « Catégories · prévu vs réel sur l'année » : mêmes groupes que le mois, cumulés. */
export function YearCategories({ months }: { months: readonly ProfessionalMonth[] }) {
  const text = fr.professional.year.categories;
  const labels = fr.professional.categories;
  const first = months[0];
  const actualMonths = months.filter((month) => month.hasActual);
  const last = actualMonths.at(-1);

  const groups: ForecastTableGroup[] = [
    {
      key: "charges",
      label: labels.groups.charges,
      rows: [
        ...(first?.charges.rows ?? []).map((chargeRow, index) =>
          row(
            chargeRow.category,
            fr.categories[chargeRow.category],
            months,
            (month) => month.charges.rows[index].amount,
          ),
        ),
        row("mixed", labels.mixedCosts, months, (month) => month.charges.mixedCosts),
        row("total", labels.totalCharges, months, (month) => month.charges.total, "total"),
      ],
    },
    {
      key: "remuneration",
      label: labels.groups.remuneration,
      rows: [
        row("bnc", labels.bnc, months, (month) => month.remuneration.bncWithdrawal),
        row("gross", labels.grossSalary, months, (month) => month.remuneration.grossSalary),
        row(
          "employer",
          labels.employer,
          months,
          (month) => month.remuneration.employerContributions,
        ),
        ...(first?.remuneration.employerContributionSplit ?? []).map((split, index) =>
          row(
            split.category,
            labels.splitOf(fr.categories[split.category as TransactionCategory]),
            months,
            (month) => month.remuneration.employerContributionSplit[index].amount,
            "detail",
          ),
        ),
        row(
          "employee",
          labels.employee,
          months,
          (month) => month.remuneration.employeeContributions,
          "memo",
        ),
        row(
          "withholding",
          labels.withholding,
          months,
          (month) => month.remuneration.withholdingTax,
          "memo",
        ),
        row("social", labels.socialCharges, months, (month) => month.profitSocialCharges, "memo"),
      ],
    },
    {
      key: "taxes",
      label: labels.groups.taxes,
      rows: [row("vat", labels.vat, months, (month) => month.vat.payment)],
    },
  ];

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Title order={2}>{text.title}</Title>
      <Text size="xs" c="dimmed" mb={8}>
        {last ? text.subtitle(monthName(1), monthName(last.month)) : text.noActual}
      </Text>
      <ForecastTable groups={groups} />
    </Paper>
  );
}
