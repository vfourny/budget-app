import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'

import {
  useIncomeTaxBrackets,
  useSetIncomeTaxBrackets,
} from '@/features/settings/hooks/use-income-tax-brackets'
import { errorMessage } from '@/lib/errors'
import { fr } from '@/lib/i18n/fr'

/** Tranche en cours d'édition : seuil en euros entiers (les seuils du barème sont toujours ronds). */
interface Row {
  fromEuros: number
  ratePercent: number
}

export function IncomeTaxBracketsForm() {
  const [year, setYear] = useState(new Date().getFullYear())
  const brackets = useIncomeTaxBrackets(year)

  return (
    <Stack gap={16}>
      <div>
        <Title order={3}>{fr.settings.incomeTax.title}</Title>
        <Text c="dimmed" size="sm">
          {fr.settings.incomeTax.description}
        </Text>
      </div>
      <NumberInput
        allowDecimal={false}
        label={fr.settings.incomeTax.year}
        max={2100}
        min={2000}
        onChange={(value) => typeof value === 'number' && setYear(value)}
        value={year}
        w={120}
      />
      {brackets.isPending && <Loader color="gold" />}
      {brackets.isError && (
        <Alert color="red" title={fr.settings.incomeTax.loadFailed} />
      )}
      {brackets.isSuccess && (
        // `key` : changer d'année remonte le formulaire, donc `useState` repart des données de l'année.
        <BracketsFields
          initial={brackets.data.map((b) => ({
            fromEuros: b.fromCents / 100,
            ratePercent: b.ratePercent,
          }))}
          key={year}
          year={year}
        />
      )}
    </Stack>
  )
}

function BracketsFields({ year, initial }: { year: number; initial: Row[] }) {
  const isEmpty = initial.length === 0
  const [draft, setDraft] = useState<Row[]>(
    isEmpty ? [{ fromEuros: 0, ratePercent: 0 }] : initial,
  )
  const save = useSetIncomeTaxBrackets()

  const valid =
    draft[0]?.fromEuros === 0 &&
    draft.every(
      (row, i) => i === 0 || row.fromEuros > (draft[i - 1]?.fromEuros ?? 0),
    )
  const changed = JSON.stringify(draft) !== JSON.stringify(initial)

  function update(index: number, patch: Partial<Row>) {
    setDraft((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  return (
    <Stack gap={12}>
      {isEmpty && <Alert color="amber">{fr.settings.incomeTax.empty}</Alert>}
      {draft.map((row, index) => (
        <Group align="flex-end" gap={12} key={index}>
          <NumberInput
            allowDecimal={false}
            aria-label={fr.settings.incomeTax.from}
            disabled={index === 0}
            label={index === 0 ? fr.settings.incomeTax.from : undefined}
            min={0}
            onChange={(value) =>
              update(index, {
                fromEuros: typeof value === 'number' ? value : 0,
              })
            }
            suffix=" €"
            thousandSeparator=" "
            value={row.fromEuros}
            w={160}
          />
          <NumberInput
            allowDecimal={false}
            aria-label={fr.settings.incomeTax.rate}
            label={index === 0 ? fr.settings.incomeTax.rate : undefined}
            max={100}
            min={0}
            onChange={(value) =>
              update(index, {
                ratePercent: typeof value === 'number' ? value : 0,
              })
            }
            suffix=" %"
            value={row.ratePercent}
            w={110}
          />
          {index > 0 && (
            <ActionIcon
              aria-label={fr.settings.incomeTax.removeBracket}
              onClick={() =>
                setDraft((rows) => rows.filter((_, i) => i !== index))
              }
              size="lg"
              variant="default"
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      ))}
      {!valid && (
        <Text c="red.4" size="sm">
          {fr.settings.incomeTax.invalid}
        </Text>
      )}
      {save.isError && (
        <Alert color="red" title={fr.settings.incomeTax.saveFailed}>
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
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            setDraft((rows) => [
              ...rows,
              {
                fromEuros: (rows[rows.length - 1]?.fromEuros ?? 0) + 1,
                ratePercent: 0,
              },
            ])
          }
          variant="default"
        >
          {fr.settings.incomeTax.addBracket}
        </Button>
        <Button
          disabled={!changed || !valid}
          loading={save.isPending}
          onClick={() =>
            save.mutate({
              year,
              brackets: draft.map((row) => ({
                fromCents: row.fromEuros * 100,
                ratePercent: row.ratePercent,
              })),
            })
          }
        >
          {fr.common.save}
        </Button>
      </Group>
    </Stack>
  )
}
