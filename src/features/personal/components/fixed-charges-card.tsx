import { Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import type { PeriodTotals } from '@server/lib/dashboard/aggregate.service'
import { IconBolt, IconHome, IconPhone, IconWifi } from '@tabler/icons-react'
import type { ComponentType } from 'react'

import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

type FixedCharge = PeriodTotals['fixedCharges'][number]
type FixedChargeCategory = FixedCharge['category']

/** Icône et couleur (tokens Mantine) de chaque catégorie de la card ; `satisfies` : clé manquante = erreur TS. */
const STYLE = {
  RENT_PAID: { Icon: IconHome, color: 'blue.3' },
  ENERGY: { Icon: IconBolt, color: 'gold.6' },
  TELECOM: { Icon: IconPhone, color: 'teal.4' },
  INTERNET: { Icon: IconWifi, color: 'grape.4' },
} as const satisfies Record<
  FixedChargeCategory,
  { Icon: ComponentType<{ size?: number }>; color: string }
>

/**
 * Bandeau « Charges fixes » (loyer, énergie, télécom, internet) : débits de la période pour les catégories
 * de `FIXED_CHARGES_CATEGORIES` (`shared/personal/rules.ts`), + leur total. Mois ou année selon la vue choisie.
 */
export function FixedChargesCard({
  fixedCharges,
}: {
  fixedCharges: readonly FixedCharge[]
}) {
  const total = fixedCharges.reduce((sum, line) => sum + line.cents, 0)

  return (
    <Paper
      aria-label={fr.personal.fixedCharges.title}
      component="section"
      mb={16}
      px={24}
      py={16}
      radius="lg"
      withBorder
    >
      <Group align="center" gap={28}>
        {fixedCharges.map(({ category, cents }) => {
          const { Icon, color } = STYLE[category]
          return (
            <Group gap={10} key={category} wrap="nowrap">
              <ThemeIcon color={color} radius="md" size={30} variant="light">
                <Icon size={14} />
              </ThemeIcon>
              <div>
                <Text c="dimmed" size="xs">
                  {fr.categories[category]}
                </Text>
                <Text fw={600} size="sm">
                  {formatCents(cents)}
                </Text>
              </div>
            </Group>
          )
        })}
        <Stack align="flex-end" gap={0} ml="auto">
          <Text c="dimmed" size="xs">
            {fr.personal.fixedCharges.total}
          </Text>
          <Text c="gold.6" fw={700} size="sm">
            {formatCents(total)}
          </Text>
        </Stack>
      </Group>
    </Paper>
  )
}
