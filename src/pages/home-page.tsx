import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { HomeOverview } from "@/features/home/components/home-overview";

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
      <HomeOverview />
    </>
  );
}
