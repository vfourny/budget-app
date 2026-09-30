import { ComingSoon } from "@/components/coming-soon";
import { PageHeader, PageTitleAccent } from "@/components/page-header";

export function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="Vue d'ensemble"
        title={
          <>
            Bonjour <PageTitleAccent>Valentin</PageTitleAccent>
          </>
        }
      />
      <ComingSoon>
        Les métriques du mois et les transactions à vérifier arriveront avec les dashboards.
      </ComingSoon>
    </>
  );
}
