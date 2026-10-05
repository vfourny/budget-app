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
prisma/                # schema/ (un .prisma par domaine), migrations/, seed.ts + seeds/
prisma.config.ts       # config CLI Prisma 7
```

Pourquoi pas Next.js : app mono-utilisateur derrière une auth, sans SEO. SSR et Server Components n'apportent rien et ajoutent des concepts. Nitro (le moteur serveur de Nuxt) se déploie sur Vercel sans config.

## Frontière front / back

- `src/**` ne peut importer de `server/**` qu'en **`import type`** (ex. le type `AppRouter`). Jamais d'import runtime (Prisma, secrets…) côté front, sinon du code serveur part dans le bundle navigateur.
- `import type` est **obligatoire** pour les types (`verbatimModuleSyntax`).
- Alias : `@/…` → `src/`, `@server/…` → `server/` (déclarés dans `vite.config.ts` **et** `tsconfig.json`).
- `src/lib/i18n/fr/enums.ts` (libellés des enums), `budget-rules.ts` (dans `shared/`) et `envelopes.ts` importent les types de l'enum Prisma depuis `@server/generated/prisma/enums`, en `import type` uniquement.

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

Routeurs actuels : `categorize` (`run` : demande à Gemini une catégorie + confiance par transaction sans catégorie d'un import en attente ; logique et prompt dans `server/lib/categorize/`) `import` (`create` : parse le CSV via le mapping de la banque, puis crée l'`ImportBatch` et ses `Transaction` en une seule transaction SQL ; `list` : historique avec nombre de lignes et de lignes « à vérifier » ; `get` : un import et ses lignes pour la relecture ; `validate` : passe l'import en `VALIDATED`, refusé tant qu'il reste une ligne à vérifier ; `delete` : supprime l'import et ses lignes en cascade) `settings` (`envelopeShares` / `setEnvelopeShares` : part du revenu recommandée par enveloppe, défauts dans `DEFAULT_ENVELOPE_PERCENTS` de `shared/budget-rules.ts` ; `incomeTaxBrackets` / `setIncomeTaxBrackets` : barème de l'IR d'une année, stocké dans `IncomeTaxBracket`, tableau vide si non renseigné), `personal` (`periods` : mois ayant des données validées ; `overview` : totaux d'un mois ou d'une année, agrégation dans `server/lib/dashboard/aggregate.ts`), `transaction` (`setCategory` : correction manuelle, `categoryConfidence` repasse à `null` = « Confirmée », refusé si l'import est validé ou si la catégorie n'est pas du type de compte), et pour le **Pro** : `professional` (`periods` : 12 mois des années avec données + année en cours ; `month` : un mois calculé + transactions, trajets, cumul km ; `year` : les 12 mois), `proForecast` (lignes de facturation prévues / réelles, montants prévus par groupe `charges` / `mixedCosts`, km prévus, « appliquer aux mois suivants », `clients` : noms déjà saisis + dernier TJM pour l'autocomplétion), `trip` (`create`, `delete`) ; `settings` porte aussi `proYear` / `proYearsConfigured` / `setProYear` (règles pro par année, héritées de l'année configurée précédente). Le filtre « transactions validées d'un type de compte » est partagé : `server/lib/dashboard/scope.ts`. Une ligne est « à vérifier » si elle n'a pas de catégorie ou si sa confiance est sous 0,7 (`server/lib/categorize/needs-review.ts`). Tous les routeurs utilisent `protectedProcedure` (session Better Auth lue dans le contexte, `UNAUTHORIZED` / code `NOT_AUTHENTICATED` sans session). L'inscription HTTP est désactivée : le compte unique est créé par le seed Prisma (`prisma/seed.ts`, un fichier par domaine dans `prisma/seeds/`, lancé par `pnpm db:seed` et après `pnpm db:reset`) depuis `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`. Le même seed insère les barèmes de l'IR (`INCOME_TAX_BRACKETS_BY_YEAR`, idempotent, sans écraser une année déjà en base) : à compléter chaque année puis `pnpm db:seed` sur chaque base. Il crée aussi une facturation Pro 2026 de départ (`prisma/seeds/pro-billing.ts` : un client, tous les jours ouvrés hors fériés via `shared/working-days.ts`, prévu à 400 €/j sur l'année, réel à 450 €/j jusqu'en septembre), sans toucher un mois qui a déjà des lignes.

### Calcul du dashboard Pro (`server/lib/pro/`)

- `load-year.ts` : quelques requêtes groupées pour une année (relevés pro et perso validés, facturation, prévisions, trajets, encaissements clients), puis appelle le calcul. Aucune règle métier ici.
- `compute-month.ts` : **fonction pure** (aucun accès base) → `ProMonth` (chaque valeur est un `Amount` `{ forecast, actual | null }`). `compute-year.ts` enchaîne les 12 mois (TVA payée = TVA due du mois précédent). La vue année = 12 × le calcul du mois.
- `regimes/` : interface `ProRegime` (rémunération, charges sociales sur bénéfice) ; `sas-ir.ts` est la seule implémentation. Ajouter l'IS ou l'EURL = un fichier + une entrée dans `regimes/index.ts`.
- Reste à encaisser : `load-year.ts` calcule le solde d'ouverture de l'année (facturé TTC réel − encaissements depuis le premier mois facturé), `compute-year.ts` le reporte de mois en mois (`openingReceivablesCents`), `compute-month.ts` l'applique (plancher à 0).
- `allocate-refunds.ts` (remboursements de frais mixtes ligne par ligne), `forecast-values.ts` (valeurs de l'éditeur : saisie, défaut N-1, mois précédent).
- Jours facturés : `BillingLine.days` en `Float`, limité aux multiples de 0,5 (exacts en binaire, validés par tRPC avec `multipleOf`) ; pas, plafond, montant jours × TJM et TJM moyen dans `shared/billing-days.ts`.
- Règles modifiables (TVA par charge, frais mixtes, groupes de l'éditeur, répartition des cotisations) : `shared/pro-rules.ts` ; catégories pro : `shared/account-categories.ts`.
- **Tests** : `pnpm test` (Vitest, config `vitest.config.ts`) sur les calculs purs (`server/**/*.test.ts`, `shared/**/*.test.ts`), lancés en CI.

## Interface : Mantine + React Router

- **Thème** : `src/lib/theme.ts` (objet `createTheme` + `cssVariablesResolver`) porte les tokens de la maquette — palettes `dark` (obsidian / platine : fond, cartes, bordures, texte), `gold` (accent, index 6 = `#C9A45C`), `amber` (à vérifier / dépassement, index 6 = `#E0894A`), polices (Instrument Serif pour les titres, Manrope pour l'UI), rayons (16 cartes, 10 contrôles, 8 petits boutons). Champs et boutons à 44 px (`src/styles/global.css`). Thème clair et sombre : suit le système par défaut (`defaultColorScheme="auto"`), bouton Système → Clair → Sombre dans la barre latérale ; le script de `index.html` applique le bon thème avant React (pas de flash).
- **Composants** : Mantine (`@mantine/core`, `@mantine/dropzone`), icônes Tabler. CSS sur mesure en CSS Modules. Pas de couleur en dur : tokens Mantine.
- **Routing** : `BrowserRouter` (`main.tsx`) + `<Routes>` (`app.tsx`). `AppLayout` (barre latérale, `<Outlet />`) enveloppe toutes les pages. Routes : `/` (redirige vers `/personal`, pas d'accueil), `/personal`, `/professional`, `/imports`, `/imports/new`, `/settings`. Les liens directs (rechargement de `/imports/new`) marchent grâce au repli SPA de Nitro (vérifié sur `pnpm preview`).
- **Écrans** : le dashboard perso (`/personal`), l'historique (`/imports`), l'import (`/imports/new`), la relecture (`/imports/:importId`) et les réglages (parts du revenu par enveloppe) sont réels ; après un import, le front enchaîne `import.create` puis `categorize.run` dans une seule mutation et redirige vers la relecture ; les autres affichent `ComingSoon` en attendant leur PR.

## Base de données : Prisma 7 + Neon

- Générateur `prisma-client` (client TS sans moteur Rust) sorti dans `server/generated/prisma/` (gitignoré, régénéré par `postinstall`).
- **Deux URLs Neon** : `DATABASE_URL` (pooled, host `-pooler`) pour le runtime via `@prisma/adapter-neon`, `DIRECT_URL` (directe) pour la CLI Prisma et les migrations (`prisma.config.ts`).
- Côté serveur, toujours passer par `db` de `@server/lib/db` (singleton mis en cache sur `globalThis` pour survivre au hot reload).
- **Schéma découpé par domaine** dans `prisma/schema/` (déclaré dans `prisma.config.ts`) : `base` (générateur, datasource), `auth` (Better Auth), `transactions` (imports, transactions, catégories), `budget` (enveloppes, IR), `pro` (Stygma). Prisma les lit comme un seul schéma : une relation peut traverser les fichiers.
- **Toute modif du schéma s'accompagne d'une migration versionnée** dans `prisma/migrations/` (`pnpm db:migrate`).
- `prisma.config.ts` n'utilise volontairement pas `env()` : il lèverait une erreur si la variable manque, ce qui casserait `prisma generate` en CI (pas de DB nécessaire).

### Modèle de données

| Modèle            | Rôle                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| `ImportBatch`     | Un fichier de relevé importé (`status` PENDING_REVIEW / VALIDATED, `fileName`)                       |
| `EnvelopeShare`   | Part du revenu (en %) recommandée pour une enveloppe ; sans ligne, la valeur par défaut s'applique   |
| `Transaction`     | Une ligne validée : date, libellé, montant en centimes, catégorie, mois/année                        |
| `ProYearSettings` | Règles pro d'une année (régime, taux en points de base, surfaces en dm², barème km en millièmes d'€) |
| `BillingLine`     | Jours (par 0,5) × TJM pour un client (`clientName`, texte libre) et un mois, prévu ou réel           |
| `MonthlyForecast` | Montant prévu d'une catégorie pour un mois (charges pro, BNC, dépenses perso des frais mixtes)       |
| `MileageForecast` | Km prévus d'un mois                                                                                  |
| `Trip`            | Trajet du journal des frais km (date, trajet, motif, km)                                             |

Enums : `AccountType` (PERSONAL / PROFESSIONAL, sur `ImportBatch` et `Transaction`), `Envelope`, `TransactionCategory` (perso + pro, voir `shared/account-categories.ts`), `ImportStatus`, `CompanyRegime`, `BillingKind`.

Sans ligne `MonthlyForecast` / `MileageForecast`, un montant prévu vaut le réel du même mois N-1 (calculé à la lecture, jamais stocké).

Choix à connaître :

- Pas de modèle `BankAccount` : `accountType` (enum PERSONAL/PROFESSIONAL) est porté directement par `ImportBatch` et `Transaction`. La banque (parseur CSV) est déduite du type (`BANK_BY_ACCOUNT_TYPE`), pas stockée.
- Les catégories sont un **enum figé**, pas une table : libellés dans `src/lib/i18n/fr/enums.ts`, enveloppes dans `shared/budget-rules.ts`.
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

| Vue / Nuxt                    | React ici                                    |
| ----------------------------- | -------------------------------------------- |
| composable                    | hook custom (`useXxx`)                       |
| `v-model`                     | input contrôlé (`value` + `onChange`)        |
| réactivité auto               | `useState` / `useEffect` explicites          |
| `computed`                    | calcul direct pendant le rendu, ou `useMemo` |
| `provide/inject`              | Context                                      |
| `server/` de Nuxt             | `server/` Nitro (même convention)            |
| scoped slot                   | render prop (`children` fonction)            |
| store local / actions nommées | `useReducer` + `dispatch`                    |

## Qualité et workflow

- **Une fonctionnalité = une branche = une PR** courte (`feat/…`, `fix/…`, `chore/…`), Conventional Commits. Trop gros → PR empilées.
- `pnpm check` (lint + typecheck + format + i18n), `pnpm test` puis `pnpm build` doivent être verts avant `/ship-pr`.
- **oxlint** (pas ESLint) avec `rules-of-hooks` et `exhaustive-deps` en erreur ; `no-console` en warning sauf `warn` / `error`.
- **lefthook** (pre-commit) : oxlint `--fix` puis Prettier sur les fichiers stagés. Ne pas contourner avec `--no-verify`.
- **Hook Claude Code** (`.claude/hooks/check.sh`) : Prettier + oxlint `--fix` + `tsc` après chaque édition.
- **CI GitHub Actions** : lint, typecheck, format, tests, build sur chaque PR et push sur `main`.
- Nitro 3 est en **beta** : version épinglée exactement dans `package.json`, ne pas la monter sans test.

## Pièges connus

- **Colonne « Solde » en double** dans l'export BoursoBank : on mappe par index de colonne, pas par nom d'en-tête (voir [import-csv.md](./import-csv.md)).
- **`pnpm lint` et `pnpm build`** utilisent des binaires natifs (oxlint, esbuild) : ne pas les lancer depuis une VM Linux sur un `node_modules` installé sous macOS, et inversement.
