import {
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import type { Envelope } from '@server/generated/prisma/enums'
import { DEFAULT_ENVELOPE_PERCENTS } from '@shared/personal-rules'
import { useState } from 'react'

import {
  useEnvelopeShares,
  useSetEnvelopeShares,
} from '@/features/settings/hooks/use-envelope-shares'
import { errorMessage } from '@/lib/errors'
import { fr } from '@/lib/i18n/fr'

type Shares = Record<Envelope, number>

export function EnvelopeSharesForm() {
  const shares = useEnvelopeShares()

  if (shares.isPending) return <Loader color="gold" />
  if (shares.isError)
    return <Alert color="red" title={fr.settings.shares.loadFailed} />

  // Le formulaire est monté une fois les données chargées : `useState` s'initialise avec elles
  // (≈ copier la valeur serveur dans un `ref` local, éditable avant d'enregistrer).
  return <SharesFields initial={shares.data} />
}

function SharesFields({ initial }: { initial: Shares }) {
  const [draft, setDraft] = useState<Shares>(initial)
  const save = useSetEnvelopeShares()

  const envelopes = Object.keys(initial) as Envelope[]
  const total = envelopes.reduce((sum, envelope) => sum + draft[envelope], 0)
  const unassigned = 100 - total
  const isDefault = envelopes.every(
    (envelope) => draft[envelope] === DEFAULT_ENVELOPE_PERCENTS[envelope],
  )
  const changed = envelopes.some(
    (envelope) => draft[envelope] !== initial[envelope],
  )

  return (
    <Stack gap={16}>
      <div>
        <Title order={3}>{fr.settings.shares.title}</Title>
        <Text c="dimmed" size="sm">
          {fr.settings.shares.description}
        </Text>
      </div>

      {envelopes.map((envelope) => (
        <NumberInput
          allowDecimal={false}
          key={envelope}
          label={fr.envelopes[envelope]}
          max={100}
          min={0}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              [envelope]: typeof value === 'number' ? value : 0,
            }))
          }
          suffix=" %"
          value={draft[envelope]}
          w={220}
        />
      ))}

      <Group gap={16}>
        <Text c={unassigned === 0 ? 'dimmed' : 'red.4'} size="sm">
          {unassigned === 0
            ? fr.settings.shares.totalOk
            : unassigned < 0
              ? fr.settings.shares.totalOver(total)
              : fr.settings.shares.totalRemaining(total, unassigned)}
        </Text>
      </Group>

      {save.isError && (
        <Alert color="red" title={fr.settings.shares.saveFailed}>
          {errorMessage(save.error)}
        </Alert>
      )}
      {save.isSuccess && !changed && (
        <Text c="teal.4" size="sm">
          {fr.common.saved}
        </Text>
      )}

      <Group>
        <Button
          disabled={!changed || unassigned !== 0}
          loading={save.isPending}
          onClick={() => save.mutate(draft)}
        >
          {fr.common.save}
        </Button>
        {/* Remplit seulement le formulaire : rien n'est enregistré avant « Enregistrer ». */}
        <Button
          disabled={isDefault}
          onClick={() => setDraft({ ...DEFAULT_ENVELOPE_PERCENTS })}
          variant="default"
        >
          {fr.settings.shares.resetDefaults}
        </Button>
      </Group>
    </Stack>
  )
}
