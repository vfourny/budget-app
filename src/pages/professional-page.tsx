import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { fr } from "@/lib/i18n/fr";

export function ProfessionalPage() {
  return (
    <>
      <PageHeader eyebrow={fr.professional.eyebrow} title={fr.professional.title} />
      <ComingSoon>{fr.professional.comingSoon}</ComingSoon>
    </>
  );
}
