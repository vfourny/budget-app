import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { HomeOverview } from "@/features/home/components/home-overview";
import { CURRENT_USER } from "@/lib/current-user";
import { fr } from "@/lib/i18n/fr";

export function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow={fr.home.eyebrow}
        title={
          <>
            {fr.home.greeting} <PageTitleAccent>{CURRENT_USER.name}</PageTitleAccent>
          </>
        }
      />
      <HomeOverview />
    </>
  );
}
