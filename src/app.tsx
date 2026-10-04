import { Route, Routes } from "react-router";

import { AppLayout } from "@/features/layout/components/app-layout";
import { HomePage } from "@/pages/home-page";
import { ImportPage } from "@/pages/import-page";
import { ImportReviewPage } from "@/pages/import-review-page";
import { ImportsPage } from "@/pages/imports-page";
import { PersonalPage } from "@/pages/personal-page";
import { ProfessionalPage } from "@/pages/professional-page";
import { SettingsPage } from "@/pages/settings-page";

// Table des routes ≈ `routes: [...]` de Vue Router. La route sans `path` (AppLayout) est un
// layout : elle affiche la barre latérale et rend la page enfant à la place de `<Outlet />`.
export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="personal" element={<PersonalPage />} />
        <Route path="professional" element={<ProfessionalPage />} />
        <Route path="imports" element={<ImportsPage />} />
        <Route path="imports/new" element={<ImportPage />} />
        <Route path="imports/:importId" element={<ImportReviewPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
