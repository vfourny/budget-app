import { Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconBolt, IconHome, IconPhone, IconWifi } from "@tabler/icons-react";
import type { ComponentType } from "react";

import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { PeriodTotals } from "@server/lib/dashboard/aggregate";

type FixedCharge = PeriodTotals["fixedCharges"][number];
type FixedChargeCategory = FixedCharge["category"];

/** Icône et couleur (tokens Mantine) de chaque catégorie de la card ; `satisfies` : clé manquante = erreur TS. */
const STYLE = {
  RENT: { Icon: IconHome, color: "blue.3" },
  ENERGY: { Icon: IconBolt, color: "gold.6" },
  TELECOM: { Icon: IconPhone, color: "teal.4" },
  INTERNET: { Icon: IconWifi, color: "grape.4" },
} as const satisfies Record<
  FixedChargeCategory,
  { Icon: ComponentType<{ size?: number }>; color: string }
>;

/**
 * Bandeau « Charges fixes » (loyer, énergie, télécom, internet) : débits de la période pour les catégories
 * de `FIXED_CHARGES_CATEGORIES` (budget-rules), + leur total. Mois ou année selon la vue choisie.
 */
export function FixedChargesCard({ fixedCharges }: { fixedCharges: readonly FixedCharge[] }) {
  const total = fixedCharges.reduce((sum, line) => sum + line.cents, 0);

  return (
    <Paper
      component="section"
      aria-label={fr.personal.fixedCharges.title}
      withBorder
      radius="lg"
      px={24}
      py={16}
      mb={16}
    >
      <Group gap={28} align="center">
        {fixedCharges.map(({ category, cents }) => {
          const { Icon, color } = STYLE[category];
          return (
            <Group key={category} gap={10} wrap="nowrap">
              <ThemeIcon variant="light" color={color} size={30} radius="md">
                <Icon size={14} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  {fr.categories[category]}
                </Text>
                <Text size="sm" fw={600}>
                  {formatCents(cents)}
                </Text>
              </div>
            </Group>
          );
        })}
        <Stack gap={0} ml="auto" align="flex-end">
          <Text size="xs" c="dimmed">
            {fr.personal.fixedCharges.total}
          </Text>
          <Text size="sm" fw={700} c="gold.6">
            {formatCents(total)}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
