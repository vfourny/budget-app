import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
} from '@mantine/core'
import type { MonthEndBalance } from '@shared/personal/balance.util'
import { IconPencil } from '@tabler/icons-react'
import { type SubmitEvent, useState } from 'react'

import {
  useBalance,
  useSetBalance,
} from '@/features/personal/hooks/use-balance'
import type { PeriodView } from '@/hooks/use-period-selection'
import { errorMessage } from '@/lib/errors'
import { formatCents, monthName } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

const text = fr.personal.balance

/**
 * Bandeau « Solde du compte » : solde en début et fin de période, à comparer au relevé bancaire.
 * Chaque solde se corrige (crayon) : la saisie devient un repère pour les mois suivants.
 */
export function BalanceCard({
  view,
  year,
  month,
}: {
  month: number
  view: PeriodView
  year: number
}) {
  const balance = useBalance(year, view === 'month' ? month : undefined)
  // Solde en cours de correction (modale ouverte) ; `null` = modale fermée.
  const [editing, setEditing] = useState<MonthEndBalance | null>(null)

  if (balance.isPending) return <Loader color="gold" mb={16} size="sm" />
  if (balance.isError)
    return (
      <Text c="red.4" mb={16} size="sm">
        {fr.common.loadingFailed}
      </Text>
    )

  const { opening, closing } = balance.data
  const variation =
    opening.cents !== null && closing.cents !== null
      ? closing.cents - opening.cents
      : null

  return (
    <Paper
      aria-label={text.title}
      component="section"
      mb={16}
      px={24}
      py={16}
      radius="lg"
      withBorder
    >
      <Group align="flex-start" gap={40}>
        <BalancePoint
          label={view === 'month' ? text.openingMonth : text.openingYear}
          onEdit={() => setEditing(opening)}
          point={opening}
        />
        <BalancePoint
          label={view === 'month' ? text.closingMonth : text.closingYear}
          onEdit={() => setEditing(closing)}
          point={closing}
        />
        {variation !== null && (
          <Stack align="flex-end" gap={0} ml="auto">
            <Text c="dimmed" size="xs">
              {text.variation}
            </Text>
            <Text c={variation < 0 ? 'red.4' : 'teal.4'} fw={700} size="sm">
              {formatCents(variation)}
            </Text>
          </Stack>
        )}
      </Group>
      {editing && (
        <BalanceModal onClose={() => setEditing(null)} point={editing} />
      )}
    </Paper>
  )
}

function BalancePoint({
  label,
  point,
  onEdit,
}: {
  label: string
  onEdit: () => void
  point: MonthEndBalance
}) {
  return (
    <div>
      <Group gap={6}>
        <Text c="dimmed" size="xs">
          {label}
        </Text>
        <ActionIcon
          aria-label={text.edit(label)}
          color="gray"
          onClick={onEdit}
          size="xs"
          variant="subtle"
        >
          <IconPencil size={12} />
        </ActionIcon>
      </Group>
      <Group gap={8}>
        <Text c={point.cents === null ? 'dimmed' : undefined} fw={600}>
          {point.cents === null ? text.notSet : formatCents(point.cents)}
        </Text>
        {point.cents !== null && (
          <Badge
            color={point.isAnchor ? 'gold' : 'gray'}
            size="xs"
            variant="light"
          >
            {point.isAnchor ? text.anchored : text.computed}
          </Badge>
        )}
      </Group>
      <Text c="dimmed" size="xs">
        {text.endOf(monthName(point.month), point.year)}
      </Text>
      {point.driftCents !== null && point.driftCents !== 0 && (
        <Text c="amber.4" maw={260} size="xs">
          {text.drift(formatCents(point.driftCents))}
        </Text>
      )}
    </div>
  )
}

/** Saisie du solde réel en fin de mois. Montée seulement quand elle est ouverte : état initial frais. */
function BalanceModal({
  point,
  onClose,
}: {
  onClose: () => void
  point: MonthEndBalance
}) {
  // Euros affichés dans le champ (input contrôlé ≈ `v-model`) ; converti en centimes à l'envoi.
  const [euros, setEuros] = useState<number | null>(
    point.cents === null ? null : point.cents / 100,
  )
  const save = useSetBalance()
  const target = { year: point.year, month: point.month }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (euros === null) return
    save.mutate(
      { ...target, balanceCents: Math.round(euros * 100) },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      onClose={onClose}
      opened
      title={text.modal.title(monthName(point.month), point.year)}
    >
      <form onSubmit={submit}>
        <Stack gap={12}>
          <Text c="dimmed" size="sm">
            {text.modal.help}
          </Text>
          <NumberInput
            data-autofocus
            decimalScale={2}
            decimalSeparator=","
            label={text.modal.amount}
            onChange={(value) =>
              setEuros(typeof value === 'number' ? value : null)
            }
            required
            thousandSeparator=" "
            value={euros ?? ''}
          />
          {save.isError && (
            <Text c="red.4" size="sm">
              {text.modal.failed} : {errorMessage(save.error)}
            </Text>
          )}
          <Group gap={8} justify="flex-end">
            {point.isAnchor && (
              <Button
                color="red"
                loading={save.isPending}
                mr="auto"
                onClick={() =>
                  save.mutate(
                    { ...target, balanceCents: null },
                    { onSuccess: onClose },
                  )
                }
                variant="subtle"
              >
                {text.modal.clear}
              </Button>
            )}
            <Button onClick={onClose} variant="subtle">
              {fr.common.cancel}
            </Button>
            <Button loading={save.isPending} type="submit">
              {fr.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
