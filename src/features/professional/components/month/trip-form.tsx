import {
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { type SubmitEvent, useState } from 'react'

import { useCreateTrip } from '@/features/professional/hooks/use-trips'
import { errorMessage } from '@/lib/errors'
import { fr } from '@/lib/i18n/fr'

interface TripFormProps {
  /** Date proposée (AAAA-MM-JJ), dans le mois affiché. */
  defaultDate: string
  onDone: () => void
}

/** Ajout d'un trajet au journal des frais kilométriques. */
export function TripForm({ defaultDate, onDone }: TripFormProps) {
  const [date, setDate] = useState(defaultDate)
  const [route, setRoute] = useState('')
  const [reason, setReason] = useState('')
  const [km, setKm] = useState<number | null>(null)
  const create = useCreateTrip()
  const text = fr.professional.mileage.trip

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!date || !route.trim() || !km) return
    create.mutate(
      { date: new Date(`${date}T00:00:00Z`), route, reason, km },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit}>
      <Stack gap={8}>
        <Group align="flex-end" gap={8} grow>
          <TextInput
            label={text.date}
            onChange={(event) => setDate(event.currentTarget.value)}
            required
            type="date"
            value={date}
          />
          <NumberInput
            allowDecimal={false}
            label={text.km}
            min={1}
            onChange={(value) =>
              setKm(typeof value === 'number' ? value : null)
            }
            required
            value={km ?? ''}
          />
        </Group>
        <TextInput
          label={text.route}
          onChange={(event) => setRoute(event.currentTarget.value)}
          placeholder={text.routePlaceholder}
          required
          value={route}
        />
        <TextInput
          label={text.reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          placeholder={text.reasonPlaceholder}
          value={reason}
        />
        {create.isError && (
          <Text c="red.4" size="sm">
            {text.failed} : {errorMessage(create.error)}
          </Text>
        )}
        <Group gap={8} justify="flex-end">
          <Button onClick={onDone} variant="subtle">
            {text.cancel}
          </Button>
          <Button
            disabled={!route.trim() || !km}
            loading={create.isPending}
            type="submit"
          >
            {text.add}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
