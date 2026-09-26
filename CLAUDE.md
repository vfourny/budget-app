# Budget App — contexte projet

App perso de budget (méthode des enveloppes) + suivi compta pro de **Stygma SAS**.
Remplace un Google Sheet annuel (`<année>-Comptabilité`, un onglet par mois) rempli à la main
depuis les relevés bancaires. L'historique mois / année est central.

Flux cible : upload d'un relevé CSV → catégorisation par l'API Claude → relecture/correction
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

| Couche      | Choix                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Front       | React 19 (SPA) + Vite 8, TypeScript 6                                    |
| Backend     | Nitro 3 via `nitro/vite` (le moteur serveur de Nuxt) — dossier `server/` |
| API         | tRPC 11 + Zod 4, TanStack Query 5 (`@trpc/tanstack-react-query`)         |
| DB          | Prisma 7 + PostgreSQL Neon (driver adapter `@prisma/adapter-neon`)       |
| UI          | PrimeReact, thème sombre « obsidian / platine », accent doré             |
| Auth        | Better Auth (mono-utilisateur) — pas encore en place                     |
| IA          | API Anthropic pour catégoriser les lignes de relevé                      |
| Hébergement | Vercel (Hobby, détection Nitro automatique) + Neon (Free)                |
| Qualité     | oxlint (règles React hooks incluses), Prettier, `tsc`                    |

## Commandes

```bash
pnpm dev            # front + API sur un seul serveur (http://localhost:5173, API sous /api)
pnpm check          # lint + typecheck + format:check (à lancer avant toute PR)
pnpm build          # build de prod (fait aussi en CI) → .output/ (ou .vercel/output sur Vercel)
pnpm preview        # sert le build de prod localement
pnpm lint:fix       # autofix oxlint
pnpm format         # prettier --write
```

## Architecture

```
src/                   # FRONT — SPA React, tourne uniquement dans le navigateur
  main.tsx             # point d'entrée (createRoot)
  app.tsx              # composant racine
  features/<domaine>/  # import, review, dashboard… : components/ + hooks/ du domaine
  components/          # UI partagée entre features
  lib/                 # utilitaires front (client tRPC, formatage…)
server/                # BACKEND — Nitro, mêmes conventions que le server/ de Nuxt
  api/                 # routes HTTP : server/api/health.ts → GET /api/health
index.html             # page unique de la SPA
vite.config.ts         # plugins React + Nitro, alias @/ (src) et @server/ (server)
nitro.config.ts        # serverDir: ./server
```

## Conventions

- **Frontière front / back** : `src/**` ne peut importer de `server/**` qu'en `import type`
  (ex. le type du routeur tRPC). Jamais d'import runtime (Prisma, secrets…) côté front.
- **Données** : toujours via tRPC + TanStack Query. **Pas de `fetch` dans un `useEffect`.**
  `useEffect` est réservé à la synchro avec un système externe (oxlint le signale sinon).
- **Hooks custom** (`useXxx`) dans `features/<domaine>/hooks/` dès qu'une logique à état est
  réutilisée ou alourdit un composant (≈ composable Vue).
- **Montants** : entiers en **centimes**, signés (négatif = débit). Jamais de float pour de
  l'argent.
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
- Hook Claude Code (`.claude/hooks/check.sh`) : prettier + oxlint --fix + tsc après chaque
  édition ; corrige immédiatement ce qu'il remonte.
- Questions de clarification : **regroupées une fois par feature**. Si ce n'est pas bloquant,
  décide, documente l'hypothèse dans la PR (et ici si durable).

## Slash commands (`.claude/commands/`)

- `/ship-pr` — self-review, checks, commit, push, ouverture de PR.

Créer une nouvelle commande dès qu'un pattern se répète 2-3 fois (ex. ajout d'une route tRPC +
schéma Zod + modèle Prisma, ajout d'un widget dashboard).

## Roadmap MVP

1. Scaffold (Vite + Nitro + CI + CLAUDE.md) → Prisma/Neon + schéma + seed → tRPC + TanStack Query
2. Thème PrimeReact obsidian/platine (+ routing client quand il y aura plusieurs écrans)
3. Upload CSV (parser générique, mapping de colonnes configurable par banque)
4. Route tRPC `categorize` (API Claude, few-shot sur transactions validées, JSON `categoryId` + `confidence`)
5. Écran de relecture (tableau éditable groupé par import, correction inline, « Valider »)
6. Dashboard mois (par catégorie, enveloppe recommandée vs réel) + vue année
7. Après validation du MVP perso : partie pro Stygma (TVA, facturation, prévisionnel/réel)

Hors scope : synchro bancaire auto, multi-utilisateurs, facturation/TVA en v1.

## Décisions

- **SPA Vite + Nitro plutôt que Next.js** : app mono-utilisateur derrière une auth, sans SEO ;
  le SSR / les Server Components n'apportent rien ici et ajoutent des concepts. Nitro garde
  les conventions `server/` de Nuxt et se déploie sur Vercel sans config.
- Nitro 3 est encore en **beta** (version épinglée exactement dans `package.json`) ; c'est
  l'approche recommandée par Vercel pour ajouter une API à un projet Vite.
- pnpm, une seule app (pas de monorepo).
- TypeScript 6.0 (comme le template Vite), oxlint plutôt qu'ESLint (template Vite, plus rapide,
  règles `rules-of-hooks` / `exhaustive-deps` incluses).
