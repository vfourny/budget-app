import {
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import {
  useClients,
  useCreateClient,
  useUpdateClient,
} from "@/features/settings/hooks/use-clients";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/lib/i18n/fr";

/** Champs d'un client en cours d'édition (TJM en euros). */
interface ClientDraft {
  name: string;
  keyword: string;
  dailyRateEuros: number | null;
}

const EMPTY: ClientDraft = { name: "", keyword: "", dailyRateEuros: null };

const toInput = (draft: ClientDraft) => ({
  name: draft.name.trim(),
  bankLabelKeyword: draft.keyword.trim() || null,
  defaultDailyRateCents:
    draft.dailyRateEuros === null ? null : Math.round(draft.dailyRateEuros * 100),
});

/** Liste éditable des clients (Réglages › Pro) + ajout. */
export function ClientsForm() {
  const clients = useClients();
  const text = fr.settings.clients;

  return (
    <Stack gap={16}>
      <div>
        <Title order={3}>{text.title}</Title>
        <Text size="sm" c="dimmed">
          {text.description}
        </Text>
      </div>
      {clients.isPending && <Loader color="gold" />}
      {clients.isError && <Alert color="red" title={text.loadFailed} />}
      {clients.isSuccess && (
        <>
          {clients.data.length === 0 && (
            <Text size="sm" c="dimmed">
              {text.empty}
            </Text>
          )}
          {clients.data.map((client) => (
            <ClientRow
              // `key` sur les valeurs : après un enregistrement, la ligne repart des données serveur.
              key={`${client.id}:${client.name}:${client.bankLabelKeyword}:${client.defaultDailyRateCents}`}
              id={client.id}
              initial={{
                name: client.name,
                keyword: client.bankLabelKeyword ?? "",
                dailyRateEuros:
                  client.defaultDailyRateCents === null ? null : client.defaultDailyRateCents / 100,
              }}
            />
          ))}
          <ClientRow />
        </>
      )}
    </Stack>
  );
}

/** Une ligne : un client existant (`id`) ou le formulaire d'ajout (sans `id`). */
function ClientRow({ id, initial = EMPTY }: { id?: string; initial?: ClientDraft }) {
  const [draft, setDraft] = useState(initial);
  const create = useCreateClient();
  const update = useUpdateClient();
  const mutation = id ? update : create;
  const text = fr.settings.clients;
  const changed =
    draft.name !== initial.name ||
    draft.keyword !== initial.keyword ||
    draft.dailyRateEuros !== initial.dailyRateEuros;

  function save() {
    if (id) update.mutate({ id, ...toInput(draft) });
    else create.mutate(toInput(draft), { onSuccess: () => setDraft(EMPTY) });
  }

  return (
    <Stack gap={6}>
      <Group align="flex-end" gap={12}>
        <TextInput
          label={text.name}
          w={220}
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })}
        />
        <TextInput
          label={text.keyword}
          w={200}
          value={draft.keyword}
          onChange={(event) => setDraft({ ...draft, keyword: event.currentTarget.value })}
        />
        <NumberInput
          label={text.dailyRate}
          w={180}
          min={0}
          decimalScale={2}
          decimalSeparator=","
          value={draft.dailyRateEuros ?? ""}
          onChange={(value) =>
            setDraft({ ...draft, dailyRateEuros: typeof value === "number" ? value : null })
          }
        />
        <Button
          variant={id ? "default" : "filled"}
          leftSection={id ? undefined : <IconPlus size={14} />}
          disabled={!changed || draft.name.trim() === ""}
          loading={mutation.isPending}
          onClick={save}
        >
          {id ? fr.common.save : text.add}
        </Button>
      </Group>
      {mutation.isError && (
        <Text size="sm" c="red.4">
          {errorMessage(mutation.error)}
        </Text>
      )}
    </Stack>
  );
}
