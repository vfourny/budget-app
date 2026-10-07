import {
  Alert,
  Button,
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
} from "@mantine/core";
import { useState } from "react";

import { useDeleteApartment, useSaveApartment } from "@/features/settings/hooks/use-apartments";
import { errorMessage } from "@/lib/errors";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { RouterOutputs } from "@/lib/trpc";
import type { ApartmentKind } from "@server/generated/prisma/enums";
import { loanSchedule } from "@shared/apartment-loan";

export type ApartmentValues = Omit<RouterOutputs["apartment"]["list"][number], "id">;
type Loan = NonNullable<ApartmentValues["loan"]>;

const KIND_OPTIONS = (Object.keys(fr.apartmentKinds) as ApartmentKind[]).map((value) => ({
  value,
  label: fr.apartmentKinds[value],
}));

const text = fr.settings.apartments;

function defaultLoan(acquiredAt: Date): Loan {
  return {
    principalCents: 0,
    rateBps: 300,
    termMonths: 240,
    // Première échéance le mois suivant l'acquisition, le 5 par défaut.
    firstDueDate: new Date(Date.UTC(acquiredAt.getUTCFullYear(), acquiredAt.getUTCMonth() + 1, 5)),
  };
}

/** Champ en euros : la base stocke des centimes entiers, le formulaire affiche des euros. */
function EuroField(props: {
  label: string;
  description?: string;
  cents: number;
  allowNegative?: boolean;
  onChange: (cents: number) => void;
}) {
  return (
    <NumberInput
      label={props.label}
      description={props.description}
      inputWrapperOrder={["label", "input", "description"]}
      suffix={` ${text.units.euros}`}
      thousandSeparator=" "
      decimalSeparator=","
      decimalScale={2}
      min={props.allowNegative ? undefined : 0}
      step={10}
      value={props.cents / 100}
      onChange={(value) =>
        props.onChange(Math.round((typeof value === "number" ? value : 0) * 100))
      }
    />
  );
}

/** Champ en points de base : affiché en pourcentage (300 → 3 %). */
function PercentField(props: {
  label: string;
  description?: string;
  bps: number;
  onChange: (bps: number) => void;
}) {
  return (
    <NumberInput
      label={props.label}
      description={props.description}
      inputWrapperOrder={["label", "input", "description"]}
      suffix={` ${text.units.percent}`}
      decimalSeparator=","
      decimalScale={2}
      min={0}
      max={100}
      step={0.05}
      value={props.bps / 100}
      onChange={(value) =>
        props.onChange(Math.round((typeof value === "number" ? value : 0) * 100))
      }
    />
  );
}

/** `<input type="month">` / `type="date"` : valeur « aaaa-mm » ou « aaaa-mm-jj » (jour civil en UTC). */
const toMonthValue = (date: Date) => date.toISOString().slice(0, 7);
const toDayValue = (date: Date) => date.toISOString().slice(0, 10);

interface ApartmentSettingsCardProps {
  /** Absent = nouveau bien (pas encore enregistré). */
  id?: string;
  initial: ApartmentValues;
  openingYear: number;
  /** Appelé après l'enregistrement d'un nouveau bien (la liste prend le relais de la carte). */
  onCreated?: () => void;
  onCancel?: () => void;
}

export function ApartmentSettingsCard({
  id,
  initial,
  openingYear,
  onCreated,
  onCancel,
}: ApartmentSettingsCardProps) {
  // Brouillon local copié des données serveur au montage (≈ un `ref` Vue qu'on ne synchronise pas).
  const [draft, setDraft] = useState<ApartmentValues>(initial);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useSaveApartment();
  const remove = useDeleteApartment();

  const set = <Key extends keyof ApartmentValues>(key: Key, value: ApartmentValues[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setLoan = (patch: Partial<Loan>) =>
    setDraft((current) =>
      current.loan ? { ...current, loan: { ...current.loan, ...patch } } : current,
    );

  const changed = id === undefined || JSON.stringify(draft) !== JSON.stringify(initial);
  const canSave =
    changed && draft.name.trim() !== "" && (!draft.loan || draft.loan.principalCents > 0);

  // Valeur dérivée (≈ `computed`) : recalculée à chaque rendu, le tableau reste petit.
  const schedule = draft.loan && draft.loan.principalCents > 0 ? loanSchedule(draft.loan) : null;
  const first = schedule?.[0];
  const totalInterestCents = schedule?.reduce((sum, row) => sum + row.interestCents, 0) ?? 0;

  function submit() {
    save.mutate(
      { ...draft, id, openingYear },
      { onSuccess: () => id === undefined && onCreated?.() },
    );
  }

  return (
    <Paper withBorder radius="lg" p={28}>
      <Stack gap={20}>
        <Title order={3}>{draft.name.trim() || text.newTitle}</Title>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
          <TextInput
            label={text.fields.name}
            value={draft.name}
            onChange={(event) => set("name", event.currentTarget.value)}
          />
          <Select
            label={text.fields.kind}
            description={text.fields.kindHint}
            inputWrapperOrder={["label", "input", "description"]}
            data={KIND_OPTIONS}
            allowDeselect={false}
            value={draft.kind}
            onChange={(value) => value && set("kind", value as ApartmentKind)}
          />
          <TextInput
            label={text.fields.manager}
            description={text.fields.managerHint}
            inputWrapperOrder={["label", "input", "description"]}
            value={draft.managerName}
            onChange={(event) => set("managerName", event.currentTarget.value)}
          />
          <TextInput
            type="month"
            label={text.fields.acquiredAt}
            value={toMonthValue(draft.acquiredAt)}
            onChange={(event) => {
              const [year, month] = event.currentTarget.value.split("-").map(Number);
              if (year && month) set("acquiredAt", new Date(Date.UTC(year, month - 1, 1)));
            }}
          />
          <EuroField
            label={text.fields.price}
            cents={draft.priceCents}
            onChange={(value) => set("priceCents", value)}
          />
          <EuroField
            label={text.fields.rent}
            cents={draft.rentCents}
            onChange={(value) => set("rentCents", value)}
          />
          <EuroField
            label={text.fields.deposit}
            cents={draft.depositCents}
            onChange={(value) => set("depositCents", value)}
          />
          <PercentField
            label={text.fields.managementFee}
            description={text.fields.managementFeeHint}
            bps={draft.managementFeeBps}
            onChange={(value) => set("managementFeeBps", value)}
          />
          <EuroField
            label={text.fields.propertyTax}
            cents={draft.propertyTaxCents}
            onChange={(value) => set("propertyTaxCents", value)}
          />
          <EuroField
            label={text.fields.cfe}
            cents={draft.cfeCents}
            onChange={(value) => set("cfeCents", value)}
          />
          <EuroField
            label={text.fields.openingBalance(openingYear)}
            description={text.fields.openingBalanceHint}
            cents={draft.openingBalanceCents}
            allowNegative
            onChange={(value) => set("openingBalanceCents", value)}
          />
        </SimpleGrid>

        <Stack gap={12}>
          <Title order={4}>{text.loan.title}</Title>
          <Switch
            label={text.loan.enabled}
            checked={draft.loan !== null}
            onChange={(event) =>
              set("loan", event.currentTarget.checked ? defaultLoan(draft.acquiredAt) : null)
            }
          />
          {draft.loan && (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
                <EuroField
                  label={text.loan.principal}
                  cents={draft.loan.principalCents}
                  onChange={(value) => setLoan({ principalCents: value })}
                />
                <PercentField
                  label={text.loan.rate}
                  bps={draft.loan.rateBps}
                  onChange={(value) => setLoan({ rateBps: value })}
                />
                <NumberInput
                  label={text.loan.term}
                  suffix={` ${text.units.months}`}
                  min={1}
                  max={600}
                  allowDecimal={false}
                  value={draft.loan.termMonths}
                  onChange={(value) => typeof value === "number" && setLoan({ termMonths: value })}
                />
                <TextInput
                  type="date"
                  label={text.loan.firstDue}
                  value={toDayValue(draft.loan.firstDueDate)}
                  onChange={(event) => {
                    const date = new Date(`${event.currentTarget.value}T00:00:00Z`);
                    if (!Number.isNaN(date.getTime())) setLoan({ firstDueDate: date });
                  }}
                />
                <EuroField
                  label={text.loan.insurance}
                  description={text.loan.insuranceHint}
                  cents={draft.creditInsuranceCents}
                  onChange={(value) => set("creditInsuranceCents", value)}
                />
              </SimpleGrid>
              {first && (
                <Alert color="gold" variant="light" title={text.loan.summaryTitle}>
                  <Stack gap={2}>
                    <Text size="sm">
                      {text.loan.monthlyPayment(formatCents(first.paymentCents))}
                    </Text>
                    <Text size="sm">
                      {text.loan.firstInstallment(
                        formatCents(first.capitalCents),
                        formatCents(first.interestCents),
                      )}
                    </Text>
                    <Text size="sm">
                      {text.loan.totalInterest(formatCents(totalInterestCents))}
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
          <Text size="sm" c="teal.4">
            {fr.common.saved}
          </Text>
        )}

        <Group>
          <Button disabled={!canSave} loading={save.isPending} onClick={submit}>
            {fr.common.save}
          </Button>
          {id === undefined ? (
            <Button variant="default" onClick={onCancel}>
              {fr.common.cancel}
            </Button>
          ) : confirmingDelete ? (
            <>
              <Button color="red" loading={remove.isPending} onClick={() => remove.mutate({ id })}>
                {text.confirmDelete}
              </Button>
              <Button variant="default" onClick={() => setConfirmingDelete(false)}>
                {fr.common.cancel}
              </Button>
            </>
          ) : (
            <Button variant="subtle" color="red" onClick={() => setConfirmingDelete(true)}>
              {text.delete}
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
