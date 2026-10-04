import { AppShell, NavLink } from "@mantine/core";
import {
  IconBriefcase,
  IconHome2,
  IconInbox,
  IconLayoutDashboard,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router";

import classes from "@/features/layout/components/app-layout.module.css";
import { CURRENT_USER } from "@/lib/current-user";
import { fr } from "@/lib/i18n/fr";

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
}

const MAIN_NAV = [
  { to: "/", label: fr.nav.home, icon: IconHome2 },
  { to: "/personal", label: fr.nav.personal, icon: IconLayoutDashboard },
  { to: "/professional", label: fr.nav.professional, icon: IconBriefcase },
  { to: "/imports", label: fr.nav.imports, icon: IconInbox },
] as const satisfies readonly NavItem[];

const SETTINGS_NAV = {
  to: "/settings",
  label: fr.nav.settings,
  icon: IconSettings,
} as const satisfies NavItem;

function NavItemLink({ to, label, icon: IconComponent }: NavItem) {
  const { pathname } = useLocation();
  // Actif si l'URL est la page elle-même ou l'une de ses sous-pages (/imports/new).
  // `/` est traité à part, sinon il serait « actif » partout.
  const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <NavLink
      component={Link}
      to={to}
      label={label}
      active={active}
      leftSection={<IconComponent size={18} stroke={1.8} className={classes.linkIcon} />}
      classNames={{ root: classes.link }}
    />
  );
}

/** Coquille de l'app : barre latérale + contenu de la page courante.
 * `<Outlet />` ≈ `<router-view />` : c'est là que s'affiche la route enfant. */
export function AppLayout() {
  return (
    <AppShell navbar={{ width: 240, breakpoint: 0 }} padding={48}>
      <AppShell.Navbar className={classes.navbar} aria-label={fr.nav.ariaLabel}>
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
          <div className={classes.avatar}>{CURRENT_USER.initial}</div>
          <span>{CURRENT_USER.name}</span>
        </div>
      </AppShell.Navbar>
      <AppShell.Main className={classes.main}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
