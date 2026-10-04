import { PageHeader, PageTitleAccent } from "@/components/page-header";
import { HomeOverview } from "@/features/home/components/home-overview";
import { authClient } from "@/lib/auth-client";
import { fr } from "@/lib/i18n/fr";

export function HomePage() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <PageHeader
        eyebrow={fr.home.eyebrow}
        title={
          <>
            {fr.home.greeting} <PageTitleAccent>{session?.user.name}</PageTitleAccent>
          </>
        }
      />
      <HomeOverview />
    </>
  );
}
