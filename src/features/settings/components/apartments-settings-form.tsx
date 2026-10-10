import { Alert, Button, Loader, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

import {
  ApartmentSettingsCard,
  type ApartmentValues,
} from "@/features/settings/components/apartment-settings-card";
import { useApartments } from "@/features/settings/hooks/use-apartments";
import { fr } from "@/lib/i18n/fr";

/** Brouillon d'un nouveau bien : acquisition ce mois-ci, tout à zéro, sans prêt. */
function emptyApartment(): ApartmentValues {
  const now = new Date();
  return {
    name: "",
    kind: "FURNISHED",
    managerName: "",
    acquiredAt: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
    priceCents: 0,
    rentCents: 0,
    depositCents: 0,
    managementFeeBps: 0,
    creditInsuranceCents: 0,
    propertyTaxCents: 0,
    cfeCents: 0,
    loan: null,
    openingBalanceCents: 0,
  };
}

/** Réglages › onglet « Appartements » : une carte par bien + un brouillon de nouveau bien. */
export function ApartmentsSettingsForm() {
  // Le solde de début d'année saisi ici est celui de l'année en cours.
  const openingYear = new Date().getFullYear();
  const apartments = useApartments(openingYear);
  const [adding, setAdding] = useState(false);

  return (
    <Stack gap={16}>
      <div>
        <Title order={3}>{fr.settings.apartments.title}</Title>
        <Text size="sm" c="dimmed">
          {fr.settings.apartments.description}
        </Text>
      </div>

      {apartments.isPending && <Loader color="gold" />}
      {apartments.isError && <Alert color="red" title={fr.settings.apartments.loadFailed} />}
      {apartments.isSuccess && apartments.data.length === 0 && !adding && (
        <Text size="sm" c="dimmed">
          {fr.settings.apartments.empty}
        </Text>
      )}
      {apartments.isSuccess &&
        apartments.data.map(({ id, ...values }) => (
          // `key` : le brouillon d'une carte repart des données serveur si le bien change.
          <ApartmentSettingsCard key={id} id={id} initial={values} openingYear={openingYear} />
        ))}
      {adding && (
        <ApartmentSettingsCard
          initial={emptyApartment()}
          openingYear={openingYear}
          onCreated={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}
      {apartments.isSuccess && !adding && (
        <Button w="fit-content" variant="default" onClick={() => setAdding(true)}>
          {fr.settings.apartments.add}
        </Button>
      )}
    </Stack>
  );
}
