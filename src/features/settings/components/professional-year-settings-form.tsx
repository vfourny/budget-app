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
} from "@mantine/core";
import { useState } from "react";

import {
  useProfessionalYearSettings,
  useProfessionalYearsConfigured,
  useSetProfessionalYearSettings,
} from "@/features/settings/hooks/use-professional-year-settings";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/lib/i18n/fr";
import {
  DEFAULT_PROFESSIONAL_YEAR_SETTINGS,
  IR_OPTION_MAX_YEARS,
  SUPPORTED_REGIMES,
  type ProfessionalYearSettingsValues,
} from "@shared/professional-rules";
import type { CompanyRegime } from "@server/generated/prisma/enums";

type NumericKey = Exclude<keyof ProfessionalYearSettingsValues, "regime" | "irOptionFirstYear">;
type Unit = keyof typeof fr.settings.pro.units;

/**
 * Saisie d'un champ : la base stocke des entiers (centimes, points de base, dm², millièmes d'€),
 * le formulaire affiche des unités lisibles (€, %, m², €/km). `scale` = facteur stocké / affiché.
 */
interface FieldConfig {
  unit: Unit;
  scale: number;
  decimals: number;
  step: number;
  max: number;
}

const PERCENT = { unit: "percent", scale: 100, decimals: 2, step: 0.1, max: 100 } as const;
const AREA = { unit: "squareMeters", scale: 100, decimals: 2, step: 0.5, max: 1000 } as const;
const DAYS = { unit: "days", scale: 1, decimals: 0, step: 1, max: 31 } as const;

const FIELDS = {
  grossSalaryCents: { unit: "euros", scale: 100, decimals: 2, step: 10, max: 100_000 },
  employerContributionBp: PERCENT,
  employeeContributionBp: PERCENT,
  taxableNetBp: { ...PERCENT, max: 150 },
  withholdingTaxBp: PERCENT,
  profitSocialChargesBp: PERCENT,
  officeAreaDm2: AREA,
  homeAreaDm2: AREA,
  mixedKeyNumerator: DAYS,
  mixedKeyDenominator: DAYS,
  mileageRateMilli: { unit: "eurosPerKm", scale: 1000, decimals: 3, step: 0.001, max: 5 },
} as const satisfies Record<NumericKey, FieldConfig>;

/** Champs par bloc, dans l'ordre de la maquette. */
const GROUPS = {
  salary: [
    "grossSalaryCents",
    "employerContributionBp",
    "employeeContributionBp",
    "taxableNetBp",
    "withholdingTaxBp",
  ],
  profit: ["profitSocialChargesBp"],
  mixedCosts: [
    "officeAreaDm2",
    "homeAreaDm2",
    "mixedKeyNumerator",
    "mixedKeyDenominator",
    "mileageRateMilli",
  ],
} as const satisfies Record<keyof typeof fr.settings.pro.groups, readonly NumericKey[]>;

const REGIMES = Object.keys(fr.companyRegimes) as CompanyRegime[];

export function ProfessionalYearSettingsForm() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const configured = useProfessionalYearsConfigured();
  const settings = useProfessionalYearSettings(year);

  // Années proposées : celles déjà configurées + l'année dernière, l'année en cours et la suivante.
  const years = [
    ...new Set([...(configured.data ?? []), currentYear - 1, currentYear, currentYear + 1]),
  ].sort((a, b) => a - b);

  return (
    <Stack gap={20}>
      <div>
        <Title order={3}>{fr.settings.pro.title}</Title>
        <Text size="sm" c="dimmed">
          {fr.settings.pro.description}
        </Text>
      </div>

      <Stack gap={6}>
        <Text size="sm" fw={600}>
          {fr.settings.pro.year}
        </Text>
        <SegmentedControl
          w="fit-content"
          aria-label={fr.settings.pro.year}
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
          data={years.map((value) => ({
            value: String(value),
            label: configured.data?.includes(value)
              ? `${value} · ${fr.settings.pro.configured}`
              : String(value),
          }))}
        />
      </Stack>

      {settings.isPending && <Loader color="gold" />}
      {settings.isError && <Alert color="red" title={fr.settings.pro.loadFailed} />}
      {settings.isSuccess && (
        // `key` : changer d'année remonte les champs, donc le brouillon repart des valeurs de l'année.
        <ProfessionalYearFields
          key={year}
          year={year}
          initial={settings.data.values}
          note={
            settings.data.source === "own"
              ? fr.settings.pro.yearNote.own(year)
              : settings.data.fromYear !== null
                ? fr.settings.pro.yearNote.inherited(year, settings.data.fromYear)
                : fr.settings.pro.yearNote.default(year)
          }
          isOwn={settings.data.source === "own"}
        />
      )}
    </Stack>
  );
}

interface ProfessionalYearFieldsProps {
  year: number;
  initial: ProfessionalYearSettingsValues;
  note: string;
  /** Valeurs déjà enregistrées pour cette année (sinon reprises : on peut enregistrer sans modifier). */
  isOwn: boolean;
}

function ProfessionalYearFields({ year, initial, note, isOwn }: ProfessionalYearFieldsProps) {
  // Brouillon local, en unités stockées (entiers) : copié des données serveur au montage.
  const [draft, setDraft] = useState<ProfessionalYearSettingsValues>(initial);
  const save = useSetProfessionalYearSettings();

  const changed = (Object.keys(initial) as (keyof ProfessionalYearSettingsValues)[]).some(
    (key) => draft[key] !== initial[key],
  );
  const isDefault = (
    Object.keys(DEFAULT_PROFESSIONAL_YEAR_SETTINGS) as (keyof ProfessionalYearSettingsValues)[]
  ).every((key) => draft[key] === DEFAULT_PROFESSIONAL_YEAR_SETTINGS[key]);
  const invalidAreas = draft.officeAreaDm2 > draft.homeAreaDm2;
  const invalidKey = draft.mixedKeyNumerator > draft.mixedKeyDenominator;
  const canSave = (changed || !isOwn) && !invalidAreas && !invalidKey;

  const exercise = year - draft.irOptionFirstYear + 1;
  const irHint =
    exercise < 1
      ? fr.settings.pro.irOption.notActive(year)
      : exercise > IR_OPTION_MAX_YEARS
        ? fr.settings.pro.irOption.exceeded(exercise, IR_OPTION_MAX_YEARS)
        : fr.settings.pro.irOption.exercise(exercise, IR_OPTION_MAX_YEARS, year);

  function field(key: NumericKey) {
    const config: FieldConfig = FIELDS[key];
    const text = fr.settings.pro.fields[key];
    return (
      <NumberInput
        key={key}
        label={text.label}
        description={text.hint}
        inputWrapperOrder={["label", "input", "description"]}
        suffix={` ${fr.settings.pro.units[config.unit]}`}
        min={0}
        max={config.max}
        step={config.step}
        decimalScale={config.decimals}
        decimalSeparator=","
        value={draft[key] / config.scale}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            [key]: Math.round((typeof value === "number" ? value : 0) * config.scale),
          }))
        }
      />
    );
  }

  return (
    <Stack gap={20}>
      <Text size="sm" c={isOwn ? "dimmed" : "amber.3"} role="status">
        {note}
      </Text>

      <Radio.Group
        label={fr.settings.pro.regime}
        value={draft.regime}
        onChange={(value) =>
          setDraft((current) => ({ ...current, regime: value as CompanyRegime }))
        }
      >
        <Group mt={8} gap={12}>
          {REGIMES.map((regime) => {
            const supported = SUPPORTED_REGIMES.some((value) => value === regime);
            return (
              <Radio
                key={regime}
                value={regime}
                disabled={!supported}
                label={
                  <Group gap={8} wrap="nowrap">
                    {fr.companyRegimes[regime]}
                    <Badge size="xs" variant="light" color={supported ? "gold" : "gray"}>
                      {supported ? fr.settings.pro.active : fr.settings.pro.soon}
                    </Badge>
                  </Group>
                }
              />
            );
          })}
        </Group>
      </Radio.Group>
      <Text size="xs" c="dimmed">
        {fr.settings.pro.regimeNote}
      </Text>

      <NumberInput
        w={280}
        label={fr.settings.pro.irOption.label}
        description={irHint}
        inputWrapperOrder={["label", "input", "description"]}
        min={2000}
        max={2100}
        allowDecimal={false}
        value={draft.irOptionFirstYear}
        error={exercise > IR_OPTION_MAX_YEARS}
        onChange={(value) =>
          typeof value === "number" &&
          setDraft((current) => ({ ...current, irOptionFirstYear: value }))
        }
      />

      {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => (
        <Stack key={group} gap={12}>
          <div>
            <Title order={4}>{fr.settings.pro.groups[group].title}</Title>
            <Text size="sm" c="dimmed">
              {fr.settings.pro.groups[group].description}
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
            {GROUPS[group].map(field)}
          </SimpleGrid>
        </Stack>
      ))}

      {invalidAreas && <Alert color="red" title={fr.settings.pro.invalidAreas} />}
      {invalidKey && <Alert color="red" title={fr.settings.pro.invalidKey} />}
      {save.isError && (
        <Alert color="red" title={fr.settings.pro.saveFailed}>
          {errorMessage(save.error)}
        </Alert>
      )}
      {save.isSuccess && !changed && isOwn && (
        <Text size="sm" c="teal.4">
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
          variant="default"
          disabled={isDefault}
          onClick={() => setDraft({ ...DEFAULT_PROFESSIONAL_YEAR_SETTINGS })}
        >
          {fr.settings.pro.resetDefaults}
        </Button>
      </Group>
    </Stack>
  );
}
