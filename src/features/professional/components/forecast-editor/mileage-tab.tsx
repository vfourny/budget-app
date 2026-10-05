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
import { useState } from "react";

import {
  useCopyMileageToFollowingMonths,
  useMileageForecast,
  useSetMileage,
} from "@/features/professional/hooks/use-forecast-editor";
import type { Period } from "@/hooks/use-period-selection";
import { errorMessage } from "@/lib/errors";
import { capitalizedMonthName, formatCents } from "@/lib/format";
import { LOCALE, fr } from "@/lib/i18n/fr";

const rateFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });

/** Onglet « Frais km » : km prévus du mois (défaut : km réels du même mois N-1). */
export function MileageTab({ period, rateMilli }: { period: Period; rateMilli: number }) {
  const mileage = useMileageForecast(period.year, period.month);
  if (mileage.isPending) return <Loader color="gold" />;
  if (mileage.isError) return <Alert color="red" title={fr.professional.editor.loadFailed} />;
  return (
    <MileageFields
      key={`${period.year}-${period.month}`}
      period={period}
      rateMilli={rateMilli}
      initial={mileage.data.overrideKm}
      lastYearKm={mileage.data.lastYearKm}
    />
  );
}

interface MileageFieldsProps {
  period: Period;
  rateMilli: number;
  initial: number | null;
  lastYearKm: number;
}

function MileageFields({ period, rateMilli, initial, lastYearKm }: MileageFieldsProps) {
  // `null` = pas de saisie : la valeur affichée est alors celle de N-1.
  const [km, setKm] = useState<number | null>(initial);
  const save = useSetMileage();
  const copy = useCopyMileageToFollowingMonths();
  const text = fr.professional.editor;
  const shownKm = km ?? lastYearKm;
  const changed = km !== initial;
  const rate = fr.professional.mileage.rateUnit(rateFormat.format(rateMilli / 1000));

  function saveKm(onSuccess?: () => void) {
    save.mutate({ year: period.year, month: period.month, km }, { onSuccess });
  }

  return (
    <Stack gap={16}>
      <Text size="sm" c="dimmed">
        {text.mileage.hint}
      </Text>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{text.mileage.month}</Table.Th>
            <Table.Th>{text.mileage.forecastKm}</Table.Th>
            <Table.Th ta="right">{text.mileage.lastYear}</Table.Th>
            <Table.Th ta="right">{text.mileage.toDeclare}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>
              <Group gap={6}>
                <Text size="sm">{`${capitalizedMonthName(period.month)} ${period.year}`}</Text>
                {km !== null && (
                  <Badge size="xs" variant="light" color="gold" tt="none">
                    {text.amounts.modified}
                  </Badge>
                )}
              </Group>
            </Table.Td>
            <Table.Td>
              <NumberInput
                aria-label={text.mileage.forecastKm}
                w={140}
                min={0}
                allowDecimal={false}
                value={shownKm}
                onChange={(value) => setKm(typeof value === "number" ? value : 0)}
              />
            </Table.Td>
            <Table.Td ta="right" c="dimmed">
              {fr.professional.mileage.km(String(lastYearKm))}
            </Table.Td>
            <Table.Td ta="right" fw={600}>
              {formatCents(Math.round((shownKm * rateMilli) / 10))}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed">
        {text.mileage.note(rate)}
      </Text>

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
        <Button variant="subtle" disabled={km === null} onClick={() => setKm(null)}>
          {text.mileage.resetLastYear}
        </Button>
        {period.month < 12 && (
          <Button
            variant="default"
            loading={copy.isPending}
            onClick={() =>
              saveKm(() => copy.mutate({ year: period.year, month: period.month, km: shownKm }))
            }
          >
            {text.applyNext}
          </Button>
        )}
        <Button disabled={!changed} loading={save.isPending} onClick={() => saveKm()}>
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  );
}
