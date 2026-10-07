import { Navigate, Route, Routes } from "react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";
import { AppLayout } from "@/features/layout/components/app-layout";
import { LoginPage } from "@/pages/login-page";
import { ImportPage } from "@/pages/import-page";
import { ImportReviewPage } from "@/pages/import-review-page";
import { ImportsPage } from "@/pages/imports-page";
import { PersonalPage } from "@/pages/personal-page";
import { ApartmentsPage } from "@/pages/apartments-page";
import { ProfessionalPage } from "@/pages/professional-page";
import { SettingsPage } from "@/pages/settings-page";

// Table des routes ≈ `routes: [...]` de Vue Router. Les routes sans `path` sont des layouts :
// `RequireAuth` ne laisse passer que les utilisateurs connectés (sinon → /login), puis
// `AppLayout` affiche la barre latérale et rend la page enfant à la place de `<Outlet />`.
export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Pas d'accueil : `/` redirige vers le dashboard Perso. */}
          <Route index element={<Navigate to="/personal" replace />} />
          <Route path="personal" element={<PersonalPage />} />
          <Route path="professional" element={<ProfessionalPage />} />
          <Route path="apartments" element={<ApartmentsPage />} />
          <Route path="imports" element={<ImportsPage />} />
          <Route path="imports/new" element={<ImportPage />} />
          <Route path="imports/:importId" element={<ImportReviewPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
