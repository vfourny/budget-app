import { ActionIcon, AppShell, NavLink } from '@mantine/core'
import {
  type Icon,
  IconBriefcase,
  IconBuilding,
  IconInbox,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import classes from '@/features/layout/components/app-layout.module.css'
import { ColorSchemeToggle } from '@/features/layout/components/color-scheme-toggle'
import { authClient } from '@/lib/auth-client'
import { fr } from '@/lib/i18n/fr'

interface NavItem {
  icon: Icon
  label: string
  to: string
}

const MAIN_NAV = [
  { to: '/personal', label: fr.nav.personal, icon: IconLayoutDashboard },
  { to: '/professional', label: fr.nav.professional, icon: IconBriefcase },
  { to: '/apartments', label: fr.nav.apartments, icon: IconBuilding },
  { to: '/imports', label: fr.nav.imports, icon: IconInbox },
] as const satisfies readonly NavItem[]

const SETTINGS_NAV = {
  to: '/settings',
  label: fr.nav.settings,
  icon: IconSettings,
} as const satisfies NavItem

function NavItemLink({ to, label, icon: IconComponent }: NavItem) {
  const { pathname } = useLocation()
  // Actif si l'URL est la page elle-même ou l'une de ses sous-pages (/imports/new).
  const active = pathname === to || pathname.startsWith(`${to}/`)

  return (
    <NavLink
      active={active}
      classNames={{ root: classes.link }}
      component={Link}
      label={label}
      leftSection={
        <IconComponent className={classes.linkIcon} size={18} stroke={1.8} />
      }
      to={to}
    />
  )
}

/** Coquille de l'app : barre latérale + contenu de la page courante.
 * `<Outlet />` ≈ `<router-view />` : c'est là que s'affiche la route enfant. */
export function AppLayout() {
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userName = session?.user.name ?? ''

  async function handleLogout() {
    await authClient.signOut()
    // Vide le cache TanStack Query : aucune donnée de la session précédente ne doit rester en mémoire.
    queryClient.clear()
    void navigate('/login', { replace: true })
  }

  return (
    <AppShell navbar={{ width: 240, breakpoint: 0 }} padding={48}>
      <AppShell.Navbar aria-label={fr.nav.ariaLabel} className={classes.navbar}>
        <div className={classes.brand}>
          <div className={classes.brandMark}>{fr.nav.brandInitial}</div>
          <span className={classes.brandName}>{fr.nav.brandName}</span>
        </div>
        <div>
          {MAIN_NAV.map((item) => (
            <NavItemLink key={item.to} {...item} />
          ))}
        </div>
        <NavItemLink {...SETTINGS_NAV} />
        <div style={{ flexGrow: 1 }} />
        <div className={classes.user}>
          <div className={classes.avatar}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span style={{ flexGrow: 1 }}>{userName}</span>
          <ColorSchemeToggle />
          <ActionIcon
            aria-label={fr.auth.logout}
            color="gray"
            onClick={() => void handleLogout()}
            title={fr.auth.logout}
            variant="subtle"
          >
            <IconLogout size={18} stroke={1.8} />
          </ActionIcon>
        </div>
      </AppShell.Navbar>
      <AppShell.Main className={classes.main}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
