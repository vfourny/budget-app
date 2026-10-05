import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useState, type ReactNode } from "react";

import {
  useCopyForecastsToFollowingMonths,
  useForecasts,
  useSetForecasts,
  type ForecastGroupName,
} from "@/features/professional/hooks/use-forecast-editor";
import type { Period } from "@/hooks/use-period-selection";
import { errorMessage } from "@/lib/errors";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { TransactionCategory } from "@server/generated/prisma/enums";

/** Saisie par catégorie : `null` = pas de saisie (valeur par défaut N-1). En centimes. */
export type Overrides = Partial<Record<TransactionCategory, number | null>>;

export interface AmountsView {
  /** Montant affiché d'une catégorie : saisie, sinon défaut. */
  valueOf: (category: TransactionCategory) => number;
}

interface ForecastAmountsFormProps {
  period: Period;
  group: ForecastGroupName;
  /** Catégories affichées dans le tableau (les autres du groupe peuvent être rendues dans `children`). */
  rows: readonly TransactionCategory[];
  /** Colonne repère : réel du mois précédent ou même mois N-1. */
  reference: "previousMonth" | "lastYear";
  hint: string;
  /** En-têtes des deux premières colonnes (défaut : « Charge », « Prévu (€ HT) »). */
  headers?: { category: string; amount: string };
  /** Colonnes en plus (clé de répartition, part Stygma…) : en-têtes et cellules. */
  extraHeaders?: string[];
  extraCells?: (category: TransactionCategory, view: AmountsView) => ReactNode[];
  /** Contenu sous le tableau (totaux, champ BNC…), avec accès au brouillon. */
  children?: (draft: {
    view: AmountsView;
    overrides: Overrides;
    setAmount: (category: TransactionCategory, cents: number | null) => void;
  }) => ReactNode;
}

/**
 * Formulaire générique de l'éditeur pour les montants mensuels (`MonthlyForecast`) : charges pro
 * et frais mixtes. Chaque ligne montre la saisie ou, à défaut, le réel N-1 (« modifié » si saisi).
 */
export function ForecastAmountsForm(props: ForecastAmountsFormProps) {
  const { period, group } = props;
  const forecasts = useForecasts(period.year, period.month, group);

  if (forecasts.isPending) return <Loader color="gold" />;
  if (forecasts.isError) return <Alert color="red" title={fr.professional.editor.loadFailed} />;

  const initial: Overrides = Object.fromEntries(
    forecasts.data.map((value) => [value.category, value.overrideCents]),
  );
  return (
    <AmountsFields
      key={`${period.year}-${period.month}-${group}`}
      {...props}
      initial={initial}
      values={forecasts.data}
    />
  );
}

interface AmountsFieldsProps extends ForecastAmountsFormProps {
  initial: Overrides;
  values: readonly {
    category: TransactionCategory;
    lastYearCents: number;
    previousMonthCents: number;
  }[];
}

function AmountsFields({
  period,
  group,
  rows,
  reference,
  hint,
  headers = {
    category: fr.professional.editor.amounts.category,
    amount: fr.professional.editor.amounts.forecast,
  },
  extraHeaders = [],
  extraCells,
  children,
  initial,
  values,
}: AmountsFieldsProps) {
  const [overrides, setOverrides] = useState<Overrides>(initial);
  const save = useSetForecasts();
  const copy = useCopyForecastsToFollowingMonths();
  const text = fr.professional.editor;

  const byCategory = new Map(values.map((value) => [value.category, value]));
  const view: AmountsView = {
    valueOf: (category) => overrides[category] ?? byCategory.get(category)?.lastYearCents ?? 0,
  };
  const changed = values.some(
    (value) => (overrides[value.category] ?? null) !== (initial[value.category] ?? null),
  );
  const hasOverride = values.some((value) => (overrides[value.category] ?? null) !== null);

  function setAmount(category: TransactionCategory, cents: number | null) {
    setOverrides((current) => ({ ...current, [category]: cents }));
  }

  function saveAll(onSuccess?: () => void) {
    save.mutate(
      {
        year: period.year,
        month: period.month,
        group,
        values: values.map((value) => ({
          category: value.category,
          amountCents: overrides[value.category] ?? null,
        })),
      },
      { onSuccess },
    );
  }

  return (
    <Stack gap={16}>
      <Text size="sm" c="dimmed">
        {hint}
      </Text>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{headers.category}</Table.Th>
            <Table.Th>{headers.amount}</Table.Th>
            <Table.Th ta="right">
              {reference === "previousMonth" ? text.amounts.previousMonth : text.amounts.lastYear}
            </Table.Th>
            {extraHeaders.map((header) => (
              <Table.Th key={header} ta="right">
                {header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((category) => {
            const value = byCategory.get(category);
            const modified = (overrides[category] ?? null) !== null;
            return (
              <Table.Tr key={category}>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm">{fr.categories[category]}</Text>
                    {modified && (
                      <Badge size="xs" variant="light" color="gold" tt="none">
                        {text.amounts.modified}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    aria-label={text.amounts.amountAria(fr.categories[category])}
                    w={140}
                    min={0}
                    decimalScale={2}
                    decimalSeparator=","
                    value={view.valueOf(category) / 100}
                    onChange={(input) =>
                      setAmount(category, Math.round((typeof input === "number" ? input : 0) * 100))
                    }
                  />
                </Table.Td>
                <Table.Td ta="right" c="dimmed">
                  {formatCents(
                    reference === "previousMonth"
                      ? (value?.previousMonthCents ?? 0)
                      : (value?.lastYearCents ?? 0),
                  )}
                </Table.Td>
                {extraCells?.(category, view).map((cell, index) => (
                  <Table.Td key={extraHeaders[index]} ta="right">
                    {cell}
                  </Table.Td>
                ))}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {children?.({ view, overrides, setAmount })}

      {(save.isError || copy.isError) && (
        <Alert color="red" title={text.saveFailed}>
          {errorMessage(save.error ?? copy.error)}
        </Alert>
      )}
      {copy.isSuccess && !changed && (
        <Text size="sm" c="teal.4">
          {text.appliedNext}
        </Text>
      )}
      {save.isSuccess && !changed && !copy.isSuccess && (
        <Text size="sm" c="teal.4">
          {text.saved}
        </Text>
      )}

      <Group justify="flex-end">
        <Button
          variant="subtle"
          disabled={!hasOverride}
          onClick={() =>
            setOverrides(Object.fromEntries(values.map((value) => [value.category, null])))
          }
        >
          {text.amounts.resetLastYear}
        </Button>
        {period.month < 12 && (
          <Button
            variant="default"
            loading={copy.isPending}
            onClick={() =>
              saveAll(() => copy.mutate({ year: period.year, month: period.month, group }))
            }
          >
            {text.applyNext}
          </Button>
        )}
        <Button disabled={!changed} loading={save.isPending} onClick={() => saveAll()}>
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  );
}
