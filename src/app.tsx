import { Navigate, Route, Routes } from 'react-router'

import { RequireAuth } from '@/features/auth/components/require-auth'
import { AppLayout } from '@/features/layout/components/app-layout'
import { ApartmentsPage } from '@/pages/apartments-page'
import { ImportPage } from '@/pages/import-page'
import { ImportReviewPage } from '@/pages/import-review-page'
import { ImportsPage } from '@/pages/imports-page'
import { LoginPage } from '@/pages/login-page'
import { PersonalPage } from '@/pages/personal-page'
import { ProfessionalPage } from '@/pages/professional-page'
import { SettingsPage } from '@/pages/settings-page'

// Table des routes ≈ `routes: [...]` de Vue Router. Les routes sans `path` sont des layouts :
// `RequireAuth` ne laisse passer que les utilisateurs connectés (sinon → /login), puis
// `AppLayout` affiche la barre latérale et rend la page enfant à la place de `<Outlet />`.
export function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="login" />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Pas d'accueil : `/` redirige vers le dashboard Perso. */}
          <Route element={<Navigate replace to="/personal" />} index />
          <Route element={<PersonalPage />} path="personal" />
          <Route element={<ProfessionalPage />} path="professional" />
          <Route element={<ApartmentsPage />} path="apartments" />
          <Route element={<ImportsPage />} path="imports" />
          <Route element={<ImportPage />} path="imports/new" />
          <Route element={<ImportReviewPage />} path="imports/:importId" />
          <Route element={<SettingsPage />} path="settings" />
        </Route>
      </Route>
    </Routes>
  )
}
