# Budget App — contexte projet

App perso de budget (méthode des enveloppes) + suivi compta pro de **Stygma SAS**.
Remplace un Google Sheet annuel (`<année>-Comptabilité`, un onglet par mois) rempli à la main
depuis les relevés bancaires. L'historique mois / année est central.

Flux cible : upload d'un relevé CSV → catégorisation par l'IA (Gemini) → relecture/correction
→ validation → écriture en base → dashboards mois/année.

## Le développeur

Valentin est expérimenté en **Vue/Nuxt** et **débutant en React**. Il fait ce projet en React
pour apprendre.

- À chaque pattern React introduit, explique brièvement **pourquoi** et donne l'**équivalent Vue**
  (dans la description de PR, section « Notes React », et en commentaire court si utile).
  Ex. : composable → hook custom, `v-model` → input contrôlé (`value` + `onChange`),
  réactivité auto → `useState`/`useEffect` explicites, `computed` → `useMemo` ou calcul direct,
  `provide/inject` → Context.
- Reste sur les fondamentaux : `useState`, `useReducer`, Context, TanStack Query.
  **Pas de lib de state management** (Zustand, Redux, Jotai…) sans accord explicite.
- Il veut coder le moins possible et **relire des PR courtes**.

## Stack

Choix délibéré : **le plus simple possible**. SPA React (pas de SSR, pas de Server Components)

- un backend Nitro dans le même projet.

| Couche      | Choix                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Front       | React 19 (SPA) + Vite 8, TypeScript 6                                        |
| Backend     | Nitro 3 via `nitro/vite` (le moteur serveur de Nuxt) — dossier `server/`     |
| API         | tRPC 11 + Zod 4, TanStack Query 5 (`@trpc/tanstack-react-query`)             |
| DB          | Prisma 7 + PostgreSQL Neon (driver adapter `@prisma/adapter-neon`)           |
| UI          | Mantine 9 + React Router 8, thème sombre « obsidian / platine », accent doré |
| Auth        | Better Auth (mono-utilisateur) — pas encore en place                         |
| IA          | API Gemini (Google AI Studio) pour catégoriser les lignes de relevé          |
| Hébergement | Vercel (Hobby, détection Nitro automatique) + Neon (Free)                    |
| Qualité     | oxlint (règles React hooks incluses), Prettier, `tsc`                        |

## Commandes

```bash
pnpm dev            # front + API sur un seul serveur (http://localhost:5173, API sous /api)
pnpm check          # lint + typecheck + format:check (à lancer avant toute PR)
pnpm build          # build de prod (fait aussi en CI) → .output/ (ou .vercel/output sur Vercel)
pnpm preview        # sert le build de prod localement
pnpm lint:fix       # autofix oxlint
pnpm format         # prettier --write

pnpm db:migrate     # prisma migrate dev (crée + applique une migration, régénère le client)
pnpm db:studio      # Prisma Studio
```

Premier setup : `cp .env.example .env` (URLs Neon), `pnpm install` (génère le client Prisma),
`pnpm db:deploy`.

Déploiement Vercel : le script `vercel-build` applique les migrations (`prisma migrate deploy`)
avant `vite build` → `DATABASE_URL` **et** `DIRECT_URL` doivent être définies sur Vercel.

## Architecture

```
src/                   # FRONT — SPA React, tourne uniquement dans le navigateur
  main.tsx             # point d'entrée (createRoot + providers : Query, Router, Mantine)
  app.tsx              # table des routes (React Router)
  pages/               # une page = un écran (assemble un header + des composants de feature)
  features/<domaine>/  # import, review, dashboard… : components/ + hooks/ du domaine
  components/          # UI partagée entre features (PageHeader, ComingSoon…)
  lib/                 # utilitaires front : trpc.ts (client + queryClient), theme.ts (thème Mantine)…
  styles/global.css    # règles CSS globales (le thème, lui, est dans lib/theme.ts)
server/                # BACKEND — Nitro, mêmes conventions que le server/ de Nuxt
  api/                 # routes HTTP : server/api/health.ts → GET /api/health
    trpc/[...path].ts  # point d'entrée HTTP de tRPC
  trpc/                # init.ts (contexte, procédures), root.ts (appRouter), routers/<domaine>.ts
  lib/                 # db.ts (PrismaClient singleton), env.ts (validation Zod des variables)
  generated/prisma/    # client Prisma généré — gitignoré, ne pas éditer
prisma/                # schema.prisma, migrations/
prisma.config.ts       # config CLI Prisma 7 (URL directe pour les migrations)
index.html             # page unique de la SPA
vite.config.ts         # plugins React + Nitro, alias @/ (src) et @server/ (server)
nitro.config.ts        # serverDir: ./server
```

## Conventions

- **Frontière front / back** : `src/**` ne peut importer de `server/**` qu'en `import type`
  (ex. le type du routeur tRPC). Jamais d'import runtime (Prisma, secrets…) côté front.
- **Données** : toujours via tRPC + TanStack Query. **Pas de `fetch` dans un `useEffect`.**
  `useEffect` est réservé à la synchro avec un système externe (oxlint le signale sinon).
- **Pattern de lecture** : `useQuery(trpc.<domaine>.<proc>.queryOptions())` avec `trpc` de
  `@/lib/trpc`, encapsulé dans un hook de feature ; gérer `isPending` / `isError` dans le
  composant. Écriture : `useMutation(trpc.x.y.mutationOptions())` + invalidation ciblée.
- **Nouvelle route tRPC** : `server/trpc/routers/<domaine>.ts` + enregistrement dans
  `server/trpc/root.ts`. Entrées validées par `.input(zodSchema)`.
- **Valeurs dérivées** calculées pendant le rendu (≈ `computed`), pas stockées dans un
  `useState` ; `useMemo` seulement si le calcul est coûteux.
- **Hooks custom** (`useXxx`) dans `features/<domaine>/hooks/` dès qu'une logique à état est
  réutilisée ou alourdit un composant (≈ composable Vue).
- **Montants** : entiers en **centimes**, signés (négatif = débit). Jamais de float pour de
  l'argent.
- **Prisma** : côté serveur, toujours passer par `db` de `@server/lib/db`. Toute modif de
  `schema.prisma` s'accompagne d'une migration versionnée dans `prisma/migrations/`.
- **Dates** : `Transaction.date` en `@db.Date` ; `month` (1-12) et `year` dénormalisés pour les
  agrégations.
- **Typage des constantes** : pour un objet/tableau de config ou une liste figée, préférer
  `as const satisfies T` à une annotation `: T` — `satisfies` vérifie la forme (clé manquante,
  faute de frappe), `as const` garde les valeurs littérales (autocomplétion, unions dérivées via
  `keyof typeof X` / `(typeof X)[number]`). Pas de `as const` sans dérivation ni autocomplétion
  utile. Un tableau `as const` est readonly : typer les paramètres en `readonly T[]`.
- **UI** : composants Mantine, thème et tokens de la maquette dans `src/lib/theme.ts` (palettes
  `dark` / `gold` / `amber`, polices, rayons). Pas de couleur en dur dans les composants : utiliser
  les tokens Mantine (`c="gold.6"`, `var(--mantine-color-dark-5)`…). CSS sur mesure en **CSS Modules**
  (`xxx.module.css`, ≈ `<style scoped>` Vue). L'app est toujours sombre (pas de bascule clair).
- **Routing** : React Router en mode « library » (`BrowserRouter` + `<Routes>` dans `app.tsx`).
  Une nouvelle page = un fichier dans `src/pages/` + une `<Route>` ; s'il faut l'afficher dans le
  menu, l'ajouter à `MAIN_NAV` (`features/layout/components/app-layout.tsx`).
- Validation des entrées : schémas Zod, partagés entre tRPC et formulaires.
- UI en **français**, code/identifiants/commits en **anglais**.
- Imports : `@/…` pour `src/`, `@server/…` pour `server/`. `import type` obligatoire pour les
  types (`verbatimModuleSyntax`).

## Workflow Git / PR

- **Une fonctionnalité = une branche = une PR**, diff court (relisible en quelques minutes).
  Branches : `feat/…`, `fix/…`, `chore/…`. Commits : Conventional Commits.
- Si une étape est trop grosse, découpe en **PR empilées** (la PR N+1 cible la branche N).
- Avant toute PR : self-review du diff, `pnpm check` + `pnpm build` verts, puis
  `/ship-pr`. Ne présenter que du vert.
- Remplir `.github/pull_request_template.md`, section « Notes React » incluse.
- CI GitHub Actions (`.github/workflows/ci.yml`) : lint, typecheck, format, build sur chaque PR.
- Hook Git pre-commit (`lefthook.yml`, installé par `pnpm install`) : oxlint --fix + Prettier
  sur les fichiers stagés, commit bloqué s'il reste une erreur. Ne pas contourner avec
  `--no-verify` : corriger l'erreur.
- Hook Claude Code (`.claude/hooks/check.sh`) : prettier + oxlint --fix + tsc après chaque
  édition ; corrige immédiatement ce qu'il remonte.
- Questions de clarification : **regroupées une fois par feature**. Si ce n'est pas bloquant,
  décide, documente l'hypothèse dans la PR (et ici si durable).

## Slash commands (`.claude/commands/`)

- `/ship-pr` — self-review, checks, commit, push, ouverture de PR.

Créer une nouvelle commande dès qu'un pattern se répète 2-3 fois (ex. ajout d'une route tRPC +
schéma Zod + modèle Prisma, ajout d'un widget dashboard).

## Roadmap MVP

1. Scaffold (Vite + Nitro + CI + CLAUDE.md) → Prisma/Neon + schéma + seed → tRPC + TanStack Query (fait)
2. Thème obsidian/platine + routing client (fait : Mantine + React Router, menu latéral de la maquette)
3. Upload CSV (parser générique, mapping de colonnes par banque) (fait)
4. Route tRPC `categorize` (Gemini, few-shot sur transactions validées, JSON `category` (valeur de l'enum) + `confidence`) (fait)
5. Écran de relecture : historique, tableau de correction, « Valider », suppression d'un import (fait)
6. Dashboard Perso mois / année : totaux, transactions, par catégorie (fait) ; Accueil (résumé du mois + imports à vérifier) (fait) ; parts recommandées par enveloppe dans Réglages + jauges réel vs recommandé (fait) ; abonnements, IR (à faire)
7. Après validation du MVP perso : partie pro Stygma (TVA, facturation, prévisionnel/réel)

Hors scope : synchro bancaire auto, multi-utilisateurs, facturation/TVA en v1.

## Décisions

- **SPA Vite + Nitro plutôt que Next.js** : app mono-utilisateur derrière une auth, sans SEO ;
  le SSR / les Server Components n'apportent rien ici et ajoutent des concepts. Nitro garde
  les conventions `server/` de Nuxt et se déploie sur Vercel sans config.
- Nitro 3 est encore en **beta** (version épinglée exactement dans `package.json`) ; c'est
  l'approche recommandée par Vercel pour ajouter une API à un projet Vite.
- Neon : `DATABASE_URL` = URL pooled (runtime, adapter `@prisma/adapter-neon`),
  `DIRECT_URL` = URL directe (CLI Prisma / migrations, lue dans `prisma.config.ts`).
- **Pas de modèle `BankAccount`** : seul compte le type **PERSO / PRO** (enum `AccountType`, porté par
  `ImportBatch` et `Transaction`). La banque ne sert qu'à choisir le parseur CSV : elle est déduite du
  type par la constante `BANK_BY_ACCOUNT_TYPE` (`server/lib/csv/banks`), jamais stockée. Plus tard
  (appartements), le rattachement se fera par un `apartmentId` optionnel sur `Transaction` choisi à la
  relecture, pas via un compte bancaire. Supprimer un `ImportBatch` supprime ses transactions.
- **Mantine plutôt que PrimeReact** (décidé le 2026-10-01) : PrimeReact 11 est devenu sans style et
  sous licence PrimeUI (clé à renouveler), la 10 (MIT) n'est plus qu'en maintenance et a des
  couleurs codées en dur à écraser composant par composant. Mantine (MIT) se thématise par un
  objet de thème, fournit AppShell, Select, Dropzone, et `mantine-datatable` pour le tableau
  éditable de la relecture.
- **React Router** (mode library, pas de framework mode) pour le routing client : le plus
  répandu, équivalent direct de Vue Router.
- Prisma 7 stable (la 8 est en RC).
- pnpm, une seule app (pas de monorepo).
- TypeScript 6.0 (comme le template Vite), oxlint plutôt qu'ESLint (template Vite, plus rapide,
  règles `rules-of-hooks` / `exhaustive-deps` incluses).
