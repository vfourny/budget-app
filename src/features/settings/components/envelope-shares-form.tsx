import { Alert, Button, Group, Loader, NumberInput, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

import {
  useEnvelopeShares,
  useSetEnvelopeShares,
} from "@/features/settings/hooks/use-envelope-shares";
import { ENVELOPE_LABELS } from "@/lib/envelopes";
import type { BudgetEnvelope } from "@server/lib/settings/envelope-shares";

type Shares = Record<BudgetEnvelope, number>;

export function EnvelopeSharesForm() {
  const shares = useEnvelopeShares();

  if (shares.isPending) return <Loader color="gold" />;
  if (shares.isError) return <Alert color="red" title="Impossible de charger les parts." />;

  // Le formulaire est monté une fois les données chargées : `useState` s'initialise avec elles
  // (≈ copier la valeur serveur dans un `ref` local, éditable avant d'enregistrer).
  return <SharesFields initial={shares.data} />;
}

function SharesFields({ initial }: { initial: Shares }) {
  const [draft, setDraft] = useState<Shares>(initial);
  const save = useSetEnvelopeShares();

  const envelopes = Object.keys(initial) as BudgetEnvelope[];
  const total = envelopes.reduce((sum, envelope) => sum + draft[envelope], 0);
  const unassigned = 100 - total;
  const changed = envelopes.some((envelope) => draft[envelope] !== initial[envelope]);

  return (
    <Stack gap={16}>
      <div>
        <Title order={3}>Parts du revenu par enveloppe</Title>
        <Text size="sm" c="dimmed">
          Méthode des 5 comptes : le dashboard Perso compare tes dépenses réelles à ces parts de ton
          revenu du mois.
        </Text>
      </div>

      {envelopes.map((envelope) => (
        <NumberInput
          key={envelope}
          label={ENVELOPE_LABELS[envelope]}
          suffix=" %"
          min={0}
          max={100}
          allowDecimal={false}
          w={220}
          value={draft[envelope]}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              [envelope]: typeof value === "number" ? value : 0,
            }))
          }
        />
      ))}

      <Group gap={16}>
        <Text size="sm" c={unassigned < 0 ? "red.4" : "dimmed"}>
          {unassigned < 0
            ? `Total : ${total} % — dépasse 100 %`
            : `Total : ${total} % · ${unassigned} % non affecté`}
        </Text>
      </Group>

      {save.isError && (
        <Alert color="red" title="Enregistrement impossible">
          {save.error.message}
        </Alert>
      )}
      {save.isSuccess && !changed && (
        <Text size="sm" c="teal.4">
          Enregistré.
        </Text>
      )}

      <Group>
        <Button
          disabled={!changed || unassigned < 0}
          loading={save.isPending}
          onClick={() => save.mutate(draft)}
        >
          Enregistrer
        </Button>
      </Group>
    </Stack>
  );
}
