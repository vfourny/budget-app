import { Group, Paper, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";

import { InfoTip } from "@/components/info-tip";
import { AmountFigure } from "@/features/professional/components/amount-figure";
import { formatBp, formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ForecastActual, ProfessionalMonth } from "@server/lib/professional/types";

import classes from "./profit-card.module.css";

/**
 * Carte « Bénéfice » : équation CA HT − charges − salaires − cotisations = bénéfice, barre de
 * répartition du CA, puis bénéfice − BNC prélevés = reste en trésorerie, et charges sociales.
 */
export function ProfitCard({ month }: { month: ProfessionalMonth }) {
  const text = fr.professional.profit;
  const shown = (amount: ForecastActual) => amount.actual ?? amount.forecast;

  // Barre empilée : chaque poste ÷ CA HT (le bénéfice négatif n'a pas de segment).
  const segments = [
    {
      key: "charges",
      label: text.charges,
      amount: month.charges.total,
      className: classes.charges,
    },
    {
      key: "salary",
      label: text.salary,
      amount: month.remuneration.grossSalary,
      className: classes.salary,
    },
    {
      key: "employer",
      label: text.employer,
      amount: month.remuneration.employerContributions,
      className: classes.employer,
    },
    {
      key: "profit",
      label: fr.professional.profit.title,
      amount: month.profit,
      className: classes.profit,
    },
  ];
  const total = Math.max(
    shown(month.revenue),
    segments.reduce((sum, segment) => sum + Math.max(0, shown(segment.amount)), 0),
    1,
  );

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Stack gap={20}>
        <Group gap={4}>
          <Text size="sm" c="dimmed">
            {text.title}
          </Text>
          <InfoTip label={text.tip} ariaLabel={fr.professional.howComputed(text.title)} />
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing={16}>
          <AmountFigure
            label={text.revenue}
            tip={text.revenueTip}
            amount={month.revenue}
            goal="atLeast"
          />
          <AmountFigure
            label={text.charges}
            tip={text.chargesTip}
            amount={month.charges.total}
            goal="atMost"
          />
          <AmountFigure
            label={text.salary}
            tip={text.salaryTip}
            amount={month.remuneration.grossSalary}
          />
          <AmountFigure
            label={text.employer}
            tip={text.employerTip}
            amount={month.remuneration.employerContributions}
          />
          <AmountFigure
            label={text.title}
            tip={text.profitTip}
            amount={month.profit}
            goal="atLeast"
            color="gold.6"
            size="lg"
          />
        </SimpleGrid>

        <div className={classes.split} role="img" aria-label={text.splitAria}>
          {segments.map((segment) => (
            <Tooltip
              key={segment.key}
              label={`${segment.label} : ${formatCents(shown(segment.amount))}`}
            >
              <div
                className={`${classes.segment} ${segment.className}`}
                data-forecast={segment.amount.actual === null || undefined}
                style={{ width: `${(Math.max(0, shown(segment.amount)) / total) * 100}%` }}
              />
            </Tooltip>
          ))}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={16} className={classes.after}>
          <AmountFigure
            label={text.bnc}
            tip={text.bncTip}
            amount={month.remuneration.bncWithdrawal}
          />
          <AmountFigure
            label={text.retained}
            tip={text.retainedTip}
            amount={month.retained}
            goal="atLeast"
            color="teal.4"
          />
          <Stack gap={2}>
            <AmountFigure
              label={text.socialCharges}
              tip={text.socialChargesTip}
              amount={month.profitSocialCharges}
              color="red.4"
            />
            <Text size="xs" c="dimmed">
              {text.socialChargesSub(formatBp(month.settings.profitSocialChargesBp))}
            </Text>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
