import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export function PersonalPage() {
  return (
    <>
      <PageHeader eyebrow="Budget perso" title="Perso" />
      <ComingSoon>Le dashboard perso (mois / année, enveloppes) arrive bientôt.</ComingSoon>
    </>
  );
}
