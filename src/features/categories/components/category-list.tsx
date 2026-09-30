import { List, Stack, Title } from "@mantine/core";

import { TRANSACTION_CATEGORIES, TRANSACTION_CATEGORY_ORDER } from "@/lib/categories";
import { ENVELOPE_LABELS, ENVELOPE_ORDER } from "@/lib/envelopes";

export function CategoryList() {
  // Valeurs dérivées calculées pendant le rendu (≈ computed) à partir d'une constante : pas de
  // fetch ni d'état, la liste est figée (enum Prisma + libellés dans `@/lib/categories`).
  const groups = ENVELOPE_ORDER.map((envelope) => ({
    envelope,
    categories: TRANSACTION_CATEGORY_ORDER.filter(
      (category) => TRANSACTION_CATEGORIES[category].envelope === envelope,
    ),
  })).filter((group) => group.categories.length > 0);

  return (
    <Stack gap={20}>
      {groups.map((group) => (
        // `key` ≈ `:key` d'un v-for : identifie chaque élément pour le diff du DOM.
        <section key={group.envelope}>
          <Title order={3} mb={8}>
            {ENVELOPE_LABELS[group.envelope]}
          </Title>
          <List spacing={4} c="dimmed">
            {group.categories.map((category) => (
              <List.Item key={category}>{TRANSACTION_CATEGORIES[category].label}</List.Item>
            ))}
          </List>
        </section>
      ))}
    </Stack>
  );
}
