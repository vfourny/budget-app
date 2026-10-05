import { Paper, Title } from "@mantine/core";

import {
  ForecastTable,
  type ForecastGroup,
} from "@/features/professional/components/forecast-table";
import { formatBp, formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ProMonth } from "@server/lib/pro/types";
import type { TransactionCategory } from "@server/generated/prisma/enums";

/** Groupes du tableau « Prévisionnel vs réel · par catégorie » d'un mois. */
function monthForecastGroups(month: ProMonth): ForecastGroup[] {
  const text = fr.professional.categories;
  const { remuneration, settings } = month;
  const netSalary = remuneration.netSalary.actual ?? remuneration.netSalary.forecast;

  return [
    {
      key: "charges",
      label: text.groups.charges,
      rows: [
        ...month.charges.rows.map((row) => ({
          key: row.category,
          label: fr.categories[row.category],
          sub: row.vatBp > 0 ? text.vatRate(formatBp(row.vatBp)) : undefined,
          amount: row.amount,
          goal: "atMost" as const,
        })),
        {
          key: "mixed",
          label: text.mixedCosts,
          sub: text.mixedCostsSub,
          amount: month.charges.mixedCosts,
          goal: "atMost",
        },
        {
          key: "total",
          label: text.totalCharges,
          amount: month.charges.total,
          goal: "atMost",
          tone: "total",
        },
      ],
    },
    {
      key: "remuneration",
      label: text.groups.remuneration,
      rows: [
        {
          key: "bnc",
          label: text.bnc,
          sub: text.bncSub,
          amount: remuneration.bncWithdrawal,
          goal: "atMost",
        },
        {
          key: "gross",
          label: text.grossSalary,
          sub: text.netSalarySub(formatCents(netSalary)),
          amount: remuneration.grossSalary,
          goal: "atMost",
        },
        {
          key: "employer",
          label: text.employer,
          sub: text.rateOfGross(formatBp(settings.employerContributionBp)),
          amount: remuneration.employerContributions,
          goal: "atMost",
        },
        ...remuneration.employerContributionSplit.map((split) => ({
          key: split.category,
          label: text.splitOf(fr.categories[split.category as TransactionCategory]),
          amount: split.amount,
          goal: "atMost" as const,
          tone: "detail" as const,
        })),
        {
          key: "employee",
          label: text.employee,
          sub: text.employeeSub(formatBp(settings.employeeContributionBp)),
          amount: remuneration.employeeContributions,
          goal: "atMost",
          tone: "memo",
        },
        {
          key: "withholding",
          label: text.withholding,
          sub: text.withholdingSub(formatBp(settings.withholdingTaxBp)),
          amount: remuneration.withholdingTax,
          goal: "atMost",
          tone: "memo",
        },
        {
          key: "social",
          label: text.socialCharges,
          sub: text.socialChargesSub(formatBp(settings.profitSocialChargesBp)),
          amount: month.profitSocialCharges,
          goal: "atMost",
          tone: "memo",
        },
      ],
    },
    {
      key: "taxes",
      label: text.groups.taxes,
      rows: [
        {
          key: "vat",
          label: text.vat,
          sub: text.vatSub,
          amount: month.vat.payment,
          goal: "atMost",
        },
      ],
    },
  ];
}

/** Carte « Prévisionnel vs réel · par catégorie » de la vue mois. */
export function CategoryForecastCard({ month }: { month: ProMonth }) {
  return (
    <Paper
      withBorder
      radius="lg"
      p={24}
      component="section"
      aria-label={fr.professional.categories.title}
    >
      <Title order={2} mb={8}>
        {fr.professional.categories.title}
      </Title>
      <ForecastTable groups={monthForecastGroups(month)} />
    </Paper>
  );
}
