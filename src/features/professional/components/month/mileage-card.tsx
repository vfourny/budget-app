import {
  ActionIcon,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useState } from 'react'

import { InfoTip } from '@/components/info-tip'
import { TargetGauge } from '@/components/target-gauge'
import { TripForm } from '@/features/professional/components/month/trip-form'
import { useDeleteTrip } from '@/features/professional/hooks/use-trips'
import { formatCents, formatDate } from '@/lib/format'
import { fr, LOCALE } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

type MonthData = RouterOutputs['professional']['month']

const kmFormat = new Intl.NumberFormat(LOCALE)
const rateFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 })

/** « Frais kilométriques » : km réalisés vs prévus, montant à déclarer, cumul, journal des trajets. */
export function MileageCard({ month }: { month: MonthData }) {
  const text = fr.professional.mileage
  const { mileage } = month
  const rate = text.rateUnit(rateFormat.format(mileage.rateMilli / 1000))
  const delta =
    mileage.actualKm === null ? null : mileage.actualKm - mileage.forecastKm
  const km = (value: number) => text.km(kmFormat.format(value))
  const [adding, setAdding] = useState(false)
  const deleteTrip = useDeleteTrip()
  // Date proposée pour un nouveau trajet : aujourd'hui si on est dans le mois affiché, sinon le 1er.
  const today = new Date()
  const sameMonth =
    today.getFullYear() === month.year && today.getMonth() + 1 === month.month
  const defaultDate = `${month.year}-${String(month.month).padStart(2, '0')}-${String(sameMonth ? today.getDate() : 1).padStart(2, '0')}`

  return (
    <Paper
      aria-label={text.title}
      component="section"
      p={24}
      radius="lg"
      withBorder
    >
      <Group gap={4} mb={16} wrap="nowrap">
        <Title order={2}>{text.title}</Title>
        <InfoTip
          ariaLabel={fr.professional.howComputed(text.title)}
          label={text.tip(rate)}
        />
      </Group>

      <Stack gap={6}>
        <Group justify="space-between">
          <Text c="dimmed" size="sm">
            {text.done}
          </Text>
          {delta !== null && (
            <Text
              c={delta === 0 ? 'gold.6' : delta > 0 ? 'red.4' : 'teal.4'}
              size="xs"
            >
              {delta === 0
                ? text.onForecast
                : text.vsForecast(
                    `${delta > 0 ? '+' : '−'}${kmFormat.format(Math.abs(delta))}`,
                  )}
            </Text>
          )}
        </Group>
        <Group align="baseline" justify="space-between">
          <Text fw={600} fz={24}>
            {mileage.actualKm === null ? '—' : km(mileage.actualKm)}
          </Text>
          {mileage.amount.actual !== null && (
            <Text c="dimmed" size="sm">
              {text.toDeclare(formatCents(mileage.amount.actual))}
            </Text>
          )}
        </Group>
        <TargetGauge
          ariaLabel={text.gaugeAria(
            kmFormat.format(mileage.actualKm ?? 0),
            kmFormat.format(mileage.forecastKm),
          )}
          goal="atMost"
          real={mileage.actualKm}
          target={mileage.forecastKm}
        />
        <Text c="dimmed" size="xs">
          {mileage.actualKm === null ? text.noTripsYet : text.rate(rate)}
        </Text>
      </Stack>

      <SimpleGrid cols={2} mt={16} spacing={16}>
        <div>
          <Text c="dimmed" size="xs">
            {text.toDate}
          </Text>
          <Text fw={600}>{km(month.mileageToDate.km)}</Text>
          <Text c="dimmed" size="xs">
            {formatCents(month.mileageToDate.cents)}
          </Text>
        </div>
        <div>
          <Text c="dimmed" size="xs">
            {text.forecast}
          </Text>
          <Text fw={600}>{km(mileage.forecastKm)}</Text>
          <Text c="dimmed" size="xs">
            {formatCents(mileage.amount.forecast)}
          </Text>
        </div>
      </SimpleGrid>

      <Group justify="space-between" mb={8} mt={20}>
        <Text fw={600} size="sm">
          {text.journal}
        </Text>
        {!adding && (
          <Button
            onClick={() => setAdding(true)}
            size="compact-sm"
            variant="subtle"
          >
            {text.addTrip}
          </Button>
        )}
      </Group>
      {adding && (
        <Paper mb={12} p={12} radius="md" withBorder>
          <TripForm defaultDate={defaultDate} onDone={() => setAdding(false)} />
        </Paper>
      )}
      {month.trips.length === 0 ? (
        <Text c="dimmed" size="sm">
          {text.noTrips}
        </Text>
      ) : (
        <Stack gap={8}>
          {month.trips.map((trip) => (
            <Group justify="space-between" key={trip.id} wrap="nowrap">
              <div>
                <Text size="sm">
                  {formatDate(trip.date)} · {trip.route}
                </Text>
                <Text c="dimmed" size="xs">
                  {trip.reason}
                </Text>
              </div>
              <Group gap={4} wrap="nowrap">
                <Text fw={600} size="sm">
                  {km(trip.km)}
                </Text>
                <ActionIcon
                  aria-label={text.trip.remove(trip.route)}
                  color="gray"
                  loading={
                    deleteTrip.isPending && deleteTrip.variables?.id === trip.id
                  }
                  onClick={() => deleteTrip.mutate({ id: trip.id })}
                  size="sm"
                  variant="subtle"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
          <Group
            justify="space-between"
            pt={8}
            style={{ borderTop: '1px solid var(--app-border)' }}
          >
            <Text c="dimmed" size="sm">
              {text.total}
            </Text>
            <Text fw={700} size="sm">
              {km(month.trips.reduce((total, trip) => total + trip.km, 0))}
            </Text>
          </Group>
        </Stack>
      )}
    </Paper>
  )
}
