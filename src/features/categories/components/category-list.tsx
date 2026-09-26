import { useCategoriesByEnvelope } from "@/features/categories/hooks/use-categories-by-envelope";
import { ENVELOPE_LABELS } from "@/lib/envelopes";

export function CategoryList() {
  const { groups, isPending, isError, error } = useCategoriesByEnvelope();

  // Early returns ≈ v-if / v-else-if : un composant React est une fonction, on retourne
  // simplement le JSX adapté à chaque état.
  if (isPending) return <p>Chargement…</p>;
  if (isError) return <p role="alert">Erreur : {error.message}</p>;
  if (groups.length === 0) return <p>Aucune catégorie. Lance `pnpm db:seed`.</p>;

  return (
    <div>
      {groups.map((group) => (
        // `key` ≈ `:key` d'un v-for : identifie chaque élément pour le diff du DOM.
        <section key={group.envelope}>
          <h2>{ENVELOPE_LABELS[group.envelope]}</h2>
          <ul>
            {group.categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
