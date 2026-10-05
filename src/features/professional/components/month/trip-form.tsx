import { Button, Group, NumberInput, Stack, Text, TextInput } from "@mantine/core";
import { useState, type SubmitEvent } from "react";

import { useCreateTrip } from "@/features/professional/hooks/use-trips";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/lib/i18n/fr";

interface TripFormProps {
  /** Date proposée (AAAA-MM-JJ), dans le mois affiché. */
  defaultDate: string;
  onDone: () => void;
}

/** Ajout d'un trajet au journal des frais kilométriques. */
export function TripForm({ defaultDate, onDone }: TripFormProps) {
  const [date, setDate] = useState(defaultDate);
  const [route, setRoute] = useState("");
  const [reason, setReason] = useState("");
  const [km, setKm] = useState<number | null>(null);
  const create = useCreateTrip();
  const text = fr.professional.mileage.trip;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !route.trim() || !km) return;
    create.mutate(
      { date: new Date(`${date}T00:00:00Z`), route, reason, km },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit}>
      <Stack gap={8}>
        <Group gap={8} align="flex-end" grow>
          <TextInput
            type="date"
            label={text.date}
            value={date}
            onChange={(event) => setDate(event.currentTarget.value)}
            required
          />
          <NumberInput
            label={text.km}
            min={1}
            allowDecimal={false}
            value={km ?? ""}
            onChange={(value) => setKm(typeof value === "number" ? value : null)}
            required
          />
        </Group>
        <TextInput
          label={text.route}
          placeholder={text.routePlaceholder}
          value={route}
          onChange={(event) => setRoute(event.currentTarget.value)}
          required
        />
        <TextInput
          label={text.reason}
          placeholder={text.reasonPlaceholder}
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
        />
        {create.isError && (
          <Text size="sm" c="red.4">
            {text.failed} : {errorMessage(create.error)}
          </Text>
        )}
        <Group justify="flex-end" gap={8}>
          <Button variant="subtle" onClick={onDone}>
            {text.cancel}
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!route.trim() || !km}>
            {text.add}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
