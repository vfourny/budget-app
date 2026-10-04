# Spécificités techniques

Ce que l'on doit savoir avant de toucher au code. Les règles métier sont dans [fonctionnel.md](./fonctionnel.md), les conventions de workflow dans [`CLAUDE.md`](../CLAUDE.md).

## Vue d'ensemble

**SPA React + backend Nitro dans le même projet**, un seul serveur en dev (`pnpm dev` → `http://localhost:5173`, API sous `/api`).

```
src/                   # FRONT — SPA React, tourne uniquement dans le navigateur
  main.tsx             # point d'entrée (createRoot + providers : Query, Router, Mantine)
  app.tsx              # table des routes (React Router)
  pages/               # une page = un écran
  features/<domaine>/  # components/ + hooks/ propres à un domaine (import, review, dashboard…)
  components/          # UI partagée entre features
  lib/                 # utilitaires front : trpc.ts, theme.ts, envelopes.ts, categories.ts…
  styles/global.css    # règles CSS globales
server/                # BACKEND — Nitro, mêmes conventions que le server/ de Nuxt
  api/                 # routes HTTP : server/api/health.ts → GET /api/health
    trpc/[...path].ts  # point d'entrée HTTP de tRPC (/api/trpc/*)
  trpc/                # init.ts (contexte, procédures), root.ts (appRouter), routers/<domaine>.ts
  lib/                 # db.ts (PrismaClient), env.ts (validation Zod), csv/ (parseur de relevés)
  generated/prisma/    # client Prisma généré — gitignoré, ne pas éditer
prisma/                # schema.prisma, migrations/
prisma.config.ts       # config CLI Prisma 7
```

Pourquoi pas Next.js : app mono-utilisateur derrière une auth, sans SEO. SSR et Server Components n'apportent rien et ajoutent des concepts. Nitro (le moteur serveur de Nuxt) se déploie sur Vercel sans config.

## Frontière front / back

- `src/**` ne peut importer de `server/**` qu'en **`import type`** (ex. le type `AppRouter`). Jamais d'import runtime (Prisma, secrets…) côté front, sinon du code serveur part dans le bundle navigateur.
- `import type` est **obligatoire** pour les types (`verbatimModuleSyntax`).
- Alias : `@/…` → `src/`, `@server/…` → `server/` (déclarés dans `vite.config.ts` **et** `tsconfig.json`).
- `src/lib/categories.ts` et `envelopes.ts` importent les types de l'enum Prisma depuis `@server/generated/prisma/enums`, en `import type` uniquement.

## API : tRPC + TanStack Query

- Le client (`src/lib/trpc.ts`) est un **singleton de module** : dans une SPA il n'y a qu'un client, pas besoin de Context.
- **superjson** est le transformer des deux côtés : `Date` et autres types survivent au passage serveur → navigateur.
- Les erreurs de validation Zod sont exposées champ par champ dans `error.data.zodError` (utile pour les formulaires).
- `staleTime` par défaut des requêtes : 30 s.

**Lecture** : `useQuery(trpc.<domaine>.<proc>.queryOptions())`, encapsulé dans un hook de feature ; gérer `isPending` / `isError` dans le composant.
**Écriture** : `useMutation(trpc.x.y.mutationOptions())` + invalidation ciblée.
**Interdit** : `fetch` dans un `useEffect`. `useEffect` est réservé à la synchro avec un système externe (oxlint le signale sinon).

**Ajouter une route tRPC** :

1. Créer `server/trpc/routers/<domaine>.ts` (entrées validées par `.input(zodSchema)`).
2. L'enregistrer dans `server/trpc/root.ts`.
3. Côté front, un hook dans `src/features/<domaine>/hooks/`.

Routeurs actuels : `categorize` (`run` : demande à Gemini une catégorie + confiance par transaction sans catégorie d'un import en attente ; logique et prompt dans `server/lib/categorize/`) `import` (`create` : parse le CSV via le mapping de la banque, puis crée l'`ImportBatch` et ses `Transaction` en une seule transaction SQL ; `list` : historique avec nombre de lignes et de lignes « à vérifier » ; `get` : un import et ses lignes pour la relecture ; `validate` : passe l'import en `VALIDATED`, refusé tant qu'il reste une ligne à vérifier ; `delete` : supprime l'import et ses lignes en cascade) `settings` (`envelopeShares` / `setEnvelopeShares` : part du revenu recommandée par enveloppe, défauts dans `server/lib/settings/envelope-shares.ts`), `personal` (`periods` : mois ayant des données validées ; `overview` : totaux d'un mois ou d'une année, agrégation dans `server/lib/dashboard/aggregate.ts`) et `transaction` (`setCategory` : correction manuelle, `categoryConfidence` repasse à `null` = « Confirmée », refusé si l'import est validé). Une ligne est « à vérifier » si elle n'a pas de catégorie ou si sa confiance est sous 0,7 (`server/lib/categorize/needs-review.ts`). Il n'y a qu'une `publicProcedure` ; une `protectedProcedure` arrivera avec Better Auth.

## Interface : Mantine + React Router

- **Thème** : `src/lib/theme.ts` (objet `createTheme` + `cssVariablesResolver`) porte les tokens de la maquette — palettes `dark` (obsidian / platine : fond, cartes, bordures, texte), `gold` (accent, index 6 = `#C9A45C`), `amber` (à vérifier / dépassement, index 6 = `#E0894A`), polices (Instrument Serif pour les titres, Manrope pour l'UI), rayons (16 cartes, 10 contrôles, 8 petits boutons). Champs et boutons à 44 px (`src/styles/global.css`). Toujours sombre (`forceColorScheme="dark"`).
- **Composants** : Mantine (`@mantine/core`, `@mantine/dropzone`), icônes Tabler. CSS sur mesure en CSS Modules. Pas de couleur en dur : tokens Mantine.
- **Routing** : `BrowserRouter` (`main.tsx`) + `<Routes>` (`app.tsx`). `AppLayout` (barre latérale, `<Outlet />`) enveloppe toutes les pages. Routes : `/` accueil, `/personal`, `/professional`, `/imports`, `/imports/new`, `/settings`. Les liens directs (rechargement de `/imports/new`) marchent grâce au repli SPA de Nitro (vérifié sur `pnpm preview`).
- **Écrans** : l'accueil (`/` : résumé du dernier mois validé + imports à vérifier, sans route dédiée), le dashboard perso (`/personal`), l'historique (`/imports`), l'import (`/imports/new`), la relecture (`/imports/:importId`) et les réglages (liste des catégories) sont réels ; après un import, le front enchaîne `import.create` puis `categorize.run` dans une seule mutation et redirige vers la relecture ; les autres affichent `ComingSoon` en attendant leur PR.

## Base de données : Prisma 7 + Neon

- Générateur `prisma-client` (client TS sans moteur Rust) sorti dans `server/generated/prisma/` (gitignoré, régénéré par `postinstall`).
- **Deux URLs Neon** : `DATABASE_URL` (pooled, host `-pooler`) pour le runtime via `@prisma/adapter-neon`, `DIRECT_URL` (directe) pour la CLI Prisma et les migrations (`prisma.config.ts`).
- Côté serveur, toujours passer par `db` de `@server/lib/db` (singleton mis en cache sur `globalThis` pour survivre au hot reload).
- **Toute modif de `schema.prisma` s'accompagne d'une migration versionnée** dans `prisma/migrations/` (`pnpm db:migrate`).
- `prisma.config.ts` n'utilise volontairement pas `env()` : il lèverait une erreur si la variable manque, ce qui casserait `prisma generate` en CI (pas de DB nécessaire).

### Modèle de données

| Modèle          | Rôle                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `ImportBatch`   | Un fichier de relevé importé (`status` PENDING_REVIEW / VALIDATED, `fileName`)                     |
| `EnvelopeShare` | Part du revenu (en %) recommandée pour une enveloppe ; sans ligne, la valeur par défaut s'applique |
| `Transaction`   | Une ligne validée : date, libellé, montant en centimes, catégorie, mois/année                      |

Enums : `AccountType` (PERSONAL / PROFESSIONAL, sur `ImportBatch` et `Transaction`), `Envelope`, `TransactionCategory`, `ImportStatus`.

Choix à connaître :

- Pas de modèle `BankAccount` : `accountType` (enum PERSONAL/PROFESSIONAL) est porté directement par `ImportBatch` et `Transaction`. La banque (parseur CSV) est déduite du type (`BANK_BY_ACCOUNT_TYPE`), pas stockée.
- Les catégories sont un **enum figé**, pas une table : libellés et enveloppes vivent dans `src/lib/categories.ts`.
- Supprimer un `ImportBatch` supprime ses transactions (`onDelete: Cascade`).
- Index sur `(year, month)`, `(accountType, year, month)`, `category` et `importBatchId` pour les agrégations dashboards.

## Règles de code

- **Montants** : entiers en **centimes**, signés (négatif = débit). Jamais de float pour de l'argent (le parseur arrondit avec `Math.round(value * 100)`).
- **Dates** : `Transaction.date` en `@db.Date`. Le parseur construit les dates en **UTC** (`Date.UTC`) pour éviter tout décalage de fuseau ; `month` / `year` sont lus avec `getUTCMonth()` / `getUTCFullYear()`.
- **Valeurs dérivées** calculées pendant le rendu (≈ `computed` de Vue), pas stockées dans un `useState` ; `useMemo` seulement si le calcul est coûteux.
- **Hooks custom** dans `features/<domaine>/hooks/` dès qu'une logique à état est réutilisée ou alourdit un composant (≈ composable).
- **State** : fondamentaux uniquement (`useState`, `useReducer`, Context, TanStack Query). **Pas de lib de state management** sans accord explicite.
- **Validation** : schémas Zod partagés entre tRPC et formulaires.
- **Langues** : UI en français, code / identifiants / commits en anglais.
- Variables d'environnement serveur validées au démarrage par Zod (`server/lib/env.ts`). `GEMINI_API_KEY` est obligatoire ; `GEMINI_MODEL` est optionnelle (défaut `gemini-3.5-flash-lite`).

## Équivalences React ↔ Vue

Chaque PR qui introduit un pattern React le documente dans sa section « Notes React ».

| Vue / Nuxt        | React ici                                    |
| ----------------- | -------------------------------------------- |
| composable        | hook custom (`useXxx`)                       |
| `v-model`         | input contrôlé (`value` + `onChange`)        |
| réactivité auto   | `useState` / `useEffect` explicites          |
| `computed`        | calcul direct pendant le rendu, ou `useMemo` |
| `provide/inject`  | Context                                      |
| `server/` de Nuxt | `server/` Nitro (même convention)            |

## Qualité et workflow

- **Une fonctionnalité = une branche = une PR** courte (`feat/…`, `fix/…`, `chore/…`), Conventional Commits. Trop gros → PR empilées.
- `pnpm check` (lint + typecheck + format) puis `pnpm build` doivent être verts avant `/ship-pr`.
- **oxlint** (pas ESLint) avec `rules-of-hooks` et `exhaustive-deps` en erreur ; `no-console` en warning sauf `warn` / `error`.
- **lefthook** (pre-commit) : oxlint `--fix` puis Prettier sur les fichiers stagés. Ne pas contourner avec `--no-verify`.
- **Hook Claude Code** (`.claude/hooks/check.sh`) : Prettier + oxlint `--fix` + `tsc` après chaque édition.
- **CI GitHub Actions** : lint, typecheck, format, build sur chaque PR et push sur `main`.
- Nitro 3 est en **beta** : version épinglée exactement dans `package.json`, ne pas la monter sans test.

## Pièges connus

- **Colonne « Solde » en double** dans l'export BoursoBank : on mappe par index de colonne, pas par nom d'en-tête (voir [import-csv.md](./import-csv.md)).
- **`pnpm lint` et `pnpm build`** utilisent des binaires natifs (oxlint, esbuild) : ne pas les lancer depuis une VM Linux sur un `node_modules` installé sous macOS, et inversement.
- **Commentaires historiques** : `prisma/schema.prisma` mentionne encore Next / `server-only` / `src/server/db.ts` (vestiges de la version Next.js abandonnée). Le chemin réel est `server/lib/db.ts`.
