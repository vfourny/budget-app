import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export function ProfessionalPage() {
  return (
    <>
      <PageHeader eyebrow="Stygma SAS" title="Pro" />
      <ComingSoon>
        La partie pro (TVA, facturation, prévisionnel) viendra après la validation du MVP perso.
      </ComingSoon>
    </>
  );
}
