import { ActionIcon, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { InfoTip } from "@/components/info-tip";
import { TargetGauge } from "@/components/target-gauge";
import { TripForm } from "@/features/professional/components/month/trip-form";
import { useDeleteTrip } from "@/features/professional/hooks/use-trips";
import { formatCents, formatDate } from "@/lib/format";
import { LOCALE, fr } from "@/lib/i18n/fr";
import type { RouterOutputs } from "@/lib/trpc";

type MonthData = RouterOutputs["professional"]["month"];

const kmFormat = new Intl.NumberFormat(LOCALE);
const rateFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });

/** « Frais kilométriques » : km réalisés vs prévus, montant à déclarer, cumul, journal des trajets. */
export function MileageCard({ month }: { month: MonthData }) {
  const text = fr.professional.mileage;
  const { mileage } = month;
  const rate = text.rateUnit(rateFormat.format(mileage.rateMilli / 1000));
  const delta = mileage.actualKm === null ? null : mileage.actualKm - mileage.forecastKm;
  const km = (value: number) => text.km(kmFormat.format(value));
  const [adding, setAdding] = useState(false);
  const deleteTrip = useDeleteTrip();
  // Date proposée pour un nouveau trajet : aujourd'hui si on est dans le mois affiché, sinon le 1er.
  const today = new Date();
  const sameMonth = today.getFullYear() === month.year && today.getMonth() + 1 === month.month;
  const defaultDate = `${month.year}-${String(month.month).padStart(2, "0")}-${String(sameMonth ? today.getDate() : 1).padStart(2, "0")}`;

  return (
    <Paper withBorder radius="lg" p={24} component="section" aria-label={text.title}>
      <Group gap={4} mb={16} wrap="nowrap">
        <Title order={2}>{text.title}</Title>
        <InfoTip label={text.tip(rate)} ariaLabel={fr.professional.howComputed(text.title)} />
      </Group>

      <Stack gap={6}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {text.done}
          </Text>
          {delta !== null && (
            <Text size="xs" c={delta === 0 ? "gold.6" : delta > 0 ? "red.4" : "teal.4"}>
              {delta === 0
                ? text.onForecast
                : text.vsForecast(`${delta > 0 ? "+" : "−"}${kmFormat.format(Math.abs(delta))}`)}
            </Text>
          )}
        </Group>
        <Group justify="space-between" align="baseline">
          <Text fz={24} fw={600}>
            {mileage.actualKm === null ? "—" : km(mileage.actualKm)}
          </Text>
          {mileage.amount.actual !== null && (
            <Text size="sm" c="dimmed">
              {text.toDeclare(formatCents(mileage.amount.actual))}
            </Text>
          )}
        </Group>
        <TargetGauge
          real={mileage.actualKm}
          target={mileage.forecastKm}
          goal="atMost"
          ariaLabel={text.gaugeAria(
            kmFormat.format(mileage.actualKm ?? 0),
            kmFormat.format(mileage.forecastKm),
          )}
        />
        <Text size="xs" c="dimmed">
          {mileage.actualKm === null ? text.noTripsYet : text.rate(rate)}
        </Text>
      </Stack>

      <SimpleGrid cols={2} spacing={16} mt={16}>
        <div>
          <Text size="xs" c="dimmed">
            {text.toDate}
          </Text>
          <Text fw={600}>{km(month.mileageToDate.km)}</Text>
          <Text size="xs" c="dimmed">
            {formatCents(month.mileageToDate.cents)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            {text.forecast}
          </Text>
          <Text fw={600}>{km(mileage.forecastKm)}</Text>
          <Text size="xs" c="dimmed">
            {formatCents(mileage.amount.forecast)}
          </Text>
        </div>
      </SimpleGrid>

      <Group justify="space-between" mt={20} mb={8}>
        <Text size="sm" fw={600}>
          {text.journal}
        </Text>
        {!adding && (
          <Button variant="subtle" size="compact-sm" onClick={() => setAdding(true)}>
            {text.addTrip}
          </Button>
        )}
      </Group>
      {adding && (
        <Paper withBorder radius="md" p={12} mb={12}>
          <TripForm defaultDate={defaultDate} onDone={() => setAdding(false)} />
        </Paper>
      )}
      {month.trips.length === 0 ? (
        <Text size="sm" c="dimmed">
          {text.noTrips}
        </Text>
      ) : (
        <Stack gap={8}>
          {month.trips.map((trip) => (
            <Group key={trip.id} justify="space-between" wrap="nowrap">
              <div>
                <Text size="sm">
                  {formatDate(trip.date)} · {trip.route}
                </Text>
                <Text size="xs" c="dimmed">
                  {trip.reason}
                </Text>
              </div>
              <Group gap={4} wrap="nowrap">
                <Text size="sm" fw={600}>
                  {km(trip.km)}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label={text.trip.remove(trip.route)}
                  loading={deleteTrip.isPending && deleteTrip.variables?.id === trip.id}
                  onClick={() => deleteTrip.mutate({ id: trip.id })}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
          <Group
            justify="space-between"
            pt={8}
            style={{ borderTop: "1px solid var(--app-border)" }}
          >
            <Text size="sm" c="dimmed">
              {text.total}
            </Text>
            <Text size="sm" fw={700}>
              {km(month.trips.reduce((total, trip) => total + trip.km, 0))}
            </Text>
          </Group>
        </Stack>
      )}
    </Paper>
  );
}
