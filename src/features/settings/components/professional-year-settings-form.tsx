import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Radio,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import type { CompanyRegime } from '@server/generated/prisma/enums'
import {
  DEFAULT_PROFESSIONAL_YEAR_SETTINGS,
  type ProfessionalYearSettingsValues,
  SUPPORTED_REGIMES,
} from '@shared/professional-rules'
import { useState } from 'react'

import {
  useProfessionalYearsConfigured,
  useProfessionalYearSettings,
  useSetProfessionalYearSettings,
} from '@/features/settings/hooks/use-professional-year-settings'
import { errorMessage } from '@/lib/errors'
import { fr } from '@/lib/i18n/fr'

type NumericKey = Exclude<keyof ProfessionalYearSettingsValues, 'regime'>
type Unit = keyof typeof fr.settings.pro.units

/**
 * Saisie d'un champ : la base stocke des entiers (centimes, points de base, dm², millièmes d'€),
 * le formulaire affiche des unités lisibles (€, %, m², €/km). `scale` = facteur stocké / affiché.
 */
interface FieldConfig {
  decimals: number
  max: number
  scale: number
  step: number
  unit: Unit
}

const PERCENT = {
  unit: 'percent',
  scale: 100,
  decimals: 2,
  step: 0.1,
  max: 100,
} as const
const AREA = {
  unit: 'squareMeters',
  scale: 100,
  decimals: 2,
  step: 0.5,
  max: 1000,
} as const

const FIELDS = {
  employerContributionBp: PERCENT,
  employeeContributionBp: PERCENT,
  taxableNetBp: { ...PERCENT, max: 150 },
  withholdingTaxBp: PERCENT,
  profitSocialChargesBp: PERCENT,
  officeAreaDm2: AREA,
  homeAreaDm2: AREA,
  mileageRateMilli: {
    unit: 'eurosPerKm',
    scale: 1000,
    decimals: 3,
    step: 0.001,
    max: 5,
  },
} as const satisfies Record<NumericKey, FieldConfig>

/** Champs par bloc, dans l'ordre de la maquette. */
const GROUPS = {
  salary: [
    'employerContributionBp',
    'employeeContributionBp',
    'taxableNetBp',
    'withholdingTaxBp',
  ],
  profit: ['profitSocialChargesBp'],
  mixedCosts: ['officeAreaDm2', 'homeAreaDm2', 'mileageRateMilli'],
} as const satisfies Record<
  keyof typeof fr.settings.pro.groups,
  readonly NumericKey[]
>

const REGIMES = Object.keys(fr.companyRegimes) as CompanyRegime[]

export function ProfessionalYearSettingsForm() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const configured = useProfessionalYearsConfigured()
  const settings = useProfessionalYearSettings(year)

  // Années proposées : celles déjà configurées + l'année dernière, l'année en cours et la suivante.
  const years = [
    ...new Set([
      ...(configured.data ?? []),
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ]),
  ].sort((a, b) => a - b)

  return (
    <Stack gap={20}>
      <div>
        <Title order={3}>{fr.settings.pro.title}</Title>
        <Text c="dimmed" size="sm">
          {fr.settings.pro.description}
        </Text>
      </div>

      <Stack gap={6}>
        <Text fw={600} size="sm">
          {fr.settings.pro.year}
        </Text>
        <SegmentedControl
          aria-label={fr.settings.pro.year}
          data={years.map((value) => ({
            value: String(value),
            label: configured.data?.includes(value)
              ? `${value} · ${fr.settings.pro.configured}`
              : String(value),
          }))}
          onChange={(value) => setYear(Number(value))}
          value={String(year)}
          w="fit-content"
        />
      </Stack>

      {settings.isPending && <Loader color="gold" />}
      {settings.isError && (
        <Alert color="red" title={fr.settings.pro.loadFailed} />
      )}
      {settings.isSuccess && (
        // `key` : changer d'année remonte les champs, donc le brouillon repart des valeurs de l'année.
        <ProfessionalYearFields
          initial={settings.data.values}
          isOwn={settings.data.source === 'own'}
          key={year}
          note={
            settings.data.source === 'own'
              ? fr.settings.pro.yearNote.own(year)
              : settings.data.fromYear !== null
                ? fr.settings.pro.yearNote.inherited(
                    year,
                    settings.data.fromYear,
                  )
                : fr.settings.pro.yearNote.default(year)
          }
          year={year}
        />
      )}
    </Stack>
  )
}

interface ProfessionalYearFieldsProps {
  initial: ProfessionalYearSettingsValues
  /** Valeurs déjà enregistrées pour cette année (sinon reprises : on peut enregistrer sans modifier). */
  isOwn: boolean
  note: string
  year: number
}

function ProfessionalYearFields({
  year,
  initial,
  note,
  isOwn,
}: ProfessionalYearFieldsProps) {
  // Brouillon local, en unités stockées (entiers) : copié des données serveur au montage.
  const [draft, setDraft] = useState<ProfessionalYearSettingsValues>(initial)
  const save = useSetProfessionalYearSettings()

  const changed = (
    Object.keys(initial) as (keyof ProfessionalYearSettingsValues)[]
  ).some((key) => draft[key] !== initial[key])
  const isDefault = (
    Object.keys(
      DEFAULT_PROFESSIONAL_YEAR_SETTINGS,
    ) as (keyof ProfessionalYearSettingsValues)[]
  ).every((key) => draft[key] === DEFAULT_PROFESSIONAL_YEAR_SETTINGS[key])
  const invalidAreas = draft.officeAreaDm2 > draft.homeAreaDm2
  const canSave = (changed || !isOwn) && !invalidAreas

  function field(key: NumericKey) {
    const config: FieldConfig = FIELDS[key]
    const text = fr.settings.pro.fields[key]
    return (
      <NumberInput
        decimalScale={config.decimals}
        decimalSeparator=","
        description={text.hint}
        inputWrapperOrder={['label', 'input', 'description']}
        key={key}
        label={text.label}
        max={config.max}
        min={0}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            [key]: Math.round(
              (typeof value === 'number' ? value : 0) * config.scale,
            ),
          }))
        }
        step={config.step}
        suffix={` ${fr.settings.pro.units[config.unit]}`}
        value={draft[key] / config.scale}
      />
    )
  }

  return (
    <Stack gap={20}>
      <Text c={isOwn ? 'dimmed' : 'amber.3'} role="status" size="sm">
        {note}
      </Text>

      <Radio.Group
        label={fr.settings.pro.regime}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            regime: value as CompanyRegime,
          }))
        }
        value={draft.regime}
      >
        <Group gap={12} mt={8}>
          {REGIMES.map((regime) => {
            const supported = SUPPORTED_REGIMES.some(
              (value) => value === regime,
            )
            return (
              <Radio
                disabled={!supported}
                key={regime}
                label={
                  <Group gap={8} wrap="nowrap">
                    {fr.companyRegimes[regime]}
                    <Badge
                      color={supported ? 'gold' : 'gray'}
                      size="xs"
                      variant="light"
                    >
                      {supported
                        ? fr.settings.pro.active
                        : fr.settings.pro.soon}
                    </Badge>
                  </Group>
                }
                value={regime}
              />
            )
          })}
        </Group>
      </Radio.Group>
      <Text c="dimmed" size="xs">
        {fr.settings.pro.regimeNote}
      </Text>

      {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => (
        <Stack gap={12} key={group}>
          <div>
            <Title order={4}>{fr.settings.pro.groups[group].title}</Title>
            <Text c="dimmed" size="sm">
              {fr.settings.pro.groups[group].description}
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
            {GROUPS[group].map(field)}
          </SimpleGrid>
        </Stack>
      ))}

      {invalidAreas && (
        <Alert color="red" title={fr.settings.pro.invalidAreas} />
      )}
      {save.isError && (
        <Alert color="red" title={fr.settings.pro.saveFailed}>
          {errorMessage(save.error)}
        </Alert>
      )}
      {save.isSuccess && !changed && isOwn && (
        <Text c="teal.4" size="sm">
          {fr.settings.pro.savedFor(year)}
        </Text>
      )}

      <Group>
        <Button
          disabled={!canSave}
          loading={save.isPending}
          onClick={() => save.mutate({ year, values: draft })}
        >
          {fr.common.save}
        </Button>
        {/* Remplit seulement le formulaire : rien n'est enregistré avant « Enregistrer ». */}
        <Button
          disabled={isDefault}
          onClick={() => setDraft({ ...DEFAULT_PROFESSIONAL_YEAR_SETTINGS })}
          variant="default"
        >
          {fr.settings.pro.resetDefaults}
        </Button>
      </Group>
    </Stack>
  )
}
