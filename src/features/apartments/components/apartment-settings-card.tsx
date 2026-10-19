import {
  Alert,
  Button,
  Collapse,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ApartmentKind } from '@server/generated/prisma/enums'
import { loanSchedule } from '@shared/apartments/loan.util'
import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'

import { EuroField } from '@/components/euro-field'
import { PercentField } from '@/components/percent-field'
import {
  useDeleteApartment,
  useSaveApartment,
} from '@/features/apartments/hooks/use-apartments'
import { errorMessage } from '@/lib/errors'
import { formatCents } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import type { RouterOutputs } from '@/lib/trpc'

export type ApartmentValues = Omit<
  RouterOutputs['apartment']['list'][number],
  'id'
>
type Loan = NonNullable<ApartmentValues['loan']>

const KIND_OPTIONS = Object.values(ApartmentKind).map((value) => ({
  value,
  label: fr.apartmentKinds[value],
}))

const text = fr.settings.apartments

function defaultLoan(acquiredAt: Date): Loan {
  return {
    principalCents: 0,
    rateBps: 300,
    termMonths: 240,
    // Première échéance le mois suivant l'acquisition, le 5 par défaut.
    firstDueDate: new Date(
      Date.UTC(acquiredAt.getUTCFullYear(), acquiredAt.getUTCMonth() + 1, 5),
    ),
  }
}

/** `<input type="month">` / `type="date"` : valeur « aaaa-mm » ou « aaaa-mm-jj » (jour civil en UTC). */
const toMonthValue = (date: Date) => date.toISOString().slice(0, 7)
const toDayValue = (date: Date) => date.toISOString().slice(0, 10)

interface ApartmentSettingsCardProps {
  /** Absent = nouveau bien (pas encore enregistré). */
  id?: string
  initial: ApartmentValues
  onCancel?: () => void
  /** Appelé après l'enregistrement d'un nouveau bien (la liste prend le relais de la carte). */
  onCreated?: () => void
  openingYear: number
}

export function ApartmentSettingsCard({
  id,
  initial,
  openingYear,
  onCreated,
  onCancel,
}: ApartmentSettingsCardProps) {
  // Brouillon local copié des données serveur au montage (≈ un `ref` Vue qu'on ne synchronise pas).
  const [draft, setDraft] = useState<ApartmentValues>(initial)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Repliée par défaut, sauf un nouveau bien (≈ un `ref(false)` + `v-show` dans `<Transition>`).
  const [opened, { toggle }] = useDisclosure(id === undefined)
  const save = useSaveApartment()
  const remove = useDeleteApartment()

  const set = <Key extends keyof ApartmentValues>(
    key: Key,
    value: ApartmentValues[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }))
  const setLoan = (patch: Partial<Loan>) =>
    setDraft((current) =>
      current.loan
        ? { ...current, loan: { ...current.loan, ...patch } }
        : current,
    )

  const changed =
    id === undefined || JSON.stringify(draft) !== JSON.stringify(initial)
  const canSave =
    changed &&
    draft.name.trim() !== '' &&
    (!draft.loan || draft.loan.principalCents > 0)

  // Valeur dérivée (≈ `computed`) : recalculée à chaque rendu, le tableau reste petit.
  const schedule =
    draft.loan && draft.loan.principalCents > 0
      ? loanSchedule(draft.loan)
      : null
  const first = schedule?.[0]
  const totalInterestCents =
    schedule?.reduce((sum, row) => sum + row.interestCents, 0) ?? 0

  function submit() {
    save.mutate(
      { ...draft, id, openingYear },
      { onSuccess: () => id === undefined && onCreated?.() },
    )
  }

  return (
    <Paper p={28} radius="lg" withBorder>
      <UnstyledButton aria-expanded={opened} onClick={toggle} w="100%">
        <Group justify="space-between" wrap="nowrap">
          <Title order={3}>{draft.name.trim() || text.newTitle}</Title>
          <IconChevronDown
            style={{
              transform: opened ? 'rotate(180deg)' : undefined,
              transition: 'transform 200ms ease',
            }}
          />
        </Group>
      </UnstyledButton>
      {/* `Collapse` garde le contenu monté : le brouillon survit au repli. */}
      <Collapse expanded={opened}>
        <Stack gap={20} pt={20}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
            <TextInput
              label={text.fields.name}
              onChange={(event) => set('name', event.currentTarget.value)}
              value={draft.name}
            />
            <Select
              allowDeselect={false}
              data={KIND_OPTIONS}
              description={text.fields.kindHint}
              inputWrapperOrder={['label', 'input', 'description']}
              label={text.fields.kind}
              onChange={(value) => value && set('kind', value as ApartmentKind)}
              value={draft.kind}
            />
            <Switch
              checked={draft.managed}
              description={text.fields.managedHint}
              label={text.fields.managed}
              onChange={(event) => set('managed', event.currentTarget.checked)}
            />
            <TextInput
              label={text.fields.acquiredAt}
              onChange={(event) => {
                const [year, month] = event.currentTarget.value
                  .split('-')
                  .map(Number)
                if (year && month)
                  set('acquiredAt', new Date(Date.UTC(year, month - 1, 1)))
              }}
              type="month"
              value={toMonthValue(draft.acquiredAt)}
            />
            <EuroField
              cents={draft.priceCents}
              label={text.fields.price}
              onChange={(value) => set('priceCents', value)}
            />
            <EuroField
              allowNegative
              cents={draft.openingBalanceCents}
              description={text.fields.openingBalanceHint}
              label={text.fields.openingBalance(openingYear)}
              onChange={(value) => set('openingBalanceCents', value)}
            />
          </SimpleGrid>

          <Stack gap={12}>
            <Title order={4}>{text.loan.title}</Title>
            <Switch
              checked={draft.loan !== null}
              label={text.loan.enabled}
              onChange={(event) =>
                set(
                  'loan',
                  event.currentTarget.checked
                    ? defaultLoan(draft.acquiredAt)
                    : null,
                )
              }
            />
            {draft.loan && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
                  <EuroField
                    cents={draft.loan.principalCents}
                    label={text.loan.principal}
                    onChange={(value) => setLoan({ principalCents: value })}
                  />
                  <PercentField
                    bps={draft.loan.rateBps}
                    label={text.loan.rate}
                    onChange={(value) => setLoan({ rateBps: value })}
                  />
                  <NumberInput
                    allowDecimal={false}
                    label={text.loan.term}
                    max={600}
                    min={1}
                    onChange={(value) =>
                      typeof value === 'number' &&
                      setLoan({ termMonths: value })
                    }
                    suffix={` ${text.units.months}`}
                    value={draft.loan.termMonths}
                  />
                  <TextInput
                    label={text.loan.firstDue}
                    onChange={(event) => {
                      const date = new Date(
                        `${event.currentTarget.value}T00:00:00Z`,
                      )
                      if (!Number.isNaN(date.getTime()))
                        setLoan({ firstDueDate: date })
                    }}
                    type="date"
                    value={toDayValue(draft.loan.firstDueDate)}
                  />
                  <EuroField
                    cents={draft.creditInsuranceCents}
                    description={text.loan.insuranceHint}
                    label={text.loan.insurance}
                    onChange={(value) => set('creditInsuranceCents', value)}
                  />
                </SimpleGrid>
                {first && (
                  <Alert
                    color="gold"
                    title={text.loan.summaryTitle}
                    variant="light"
                  >
                    <Stack gap={2}>
                      <Text size="sm">
                        {text.loan.monthlyPayment(
                          formatCents(first.paymentCents),
                        )}
                      </Text>
                      <Text size="sm">
                        {text.loan.firstInstallment(
                          formatCents(first.capitalCents),
                          formatCents(first.interestCents),
                        )}
                      </Text>
                      <Text size="sm">
                        {text.loan.totalInterest(
                          formatCents(totalInterestCents),
                        )}
                      </Text>
                    </Stack>
                  </Alert>
                )}
              </>
            )}
          </Stack>

          {save.isError && (
            <Alert color="red" title={text.saveFailed}>
              {errorMessage(save.error)}
            </Alert>
          )}
          {remove.isError && (
            <Alert color="red" title={text.deleteFailed}>
              {errorMessage(remove.error)}
            </Alert>
          )}
          {save.isSuccess && !changed && (
            <Text c="teal.4" size="sm">
              {fr.common.saved}
            </Text>
          )}

          <Group>
            <Button
              disabled={!canSave}
              loading={save.isPending}
              onClick={submit}
            >
              {fr.common.save}
            </Button>
            {id === undefined ? (
              <Button onClick={onCancel} variant="default">
                {fr.common.cancel}
              </Button>
            ) : confirmingDelete ? (
              <>
                <Button
                  color="red"
                  loading={remove.isPending}
                  onClick={() => remove.mutate({ id })}
                >
                  {text.confirmDelete}
                </Button>
                <Button
                  onClick={() => setConfirmingDelete(false)}
                  variant="default"
                >
                  {fr.common.cancel}
                </Button>
              </>
            ) : (
              <Button
                color="red"
                onClick={() => setConfirmingDelete(true)}
                variant="subtle"
              >
                {text.delete}
              </Button>
            )}
          </Group>
        </Stack>
      </Collapse>
    </Paper>
  )
}
