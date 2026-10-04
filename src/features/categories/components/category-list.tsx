import { List, Stack, Title } from "@mantine/core";

import { ENVELOPE_CATEGORIES } from "@/lib/budget-rules";
import { ENVELOPE_ORDER } from "@/lib/envelopes";
import { fr } from "@/lib/i18n/fr";

export function CategoryList() {
  // Valeurs dérivées calculées pendant le rendu (≈ computed) à partir d'une constante : pas de
  // fetch ni d'état : rattachement dans `@/lib/budget-rules`, libellés dans `@/lib/i18n/fr`.
  const groups = ENVELOPE_ORDER.map((envelope) => ({
    envelope,
    categories: ENVELOPE_CATEGORIES[envelope],
  })).filter((group) => group.categories.length > 0);

  return (
    <Stack gap={20}>
      {groups.map((group) => (
        // `key` ≈ `:key` d'un v-for : identifie chaque élément pour le diff du DOM.
        <section key={group.envelope}>
          <Title order={3} mb={8}>
            {fr.envelopes[group.envelope]}
          </Title>
          <List spacing={4} c="dimmed">
            {group.categories.map((category) => (
              <List.Item key={category}>{fr.categories[category]}</List.Item>
            ))}
          </List>
        </section>
      ))}
    </Stack>
  );
}
