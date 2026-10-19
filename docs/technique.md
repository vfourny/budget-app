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
  lib/                 # utilitaires front : trpc.ts, theme.ts, envelopes.ts, errors.ts, i18n/fr/…
  styles/global.css    # règles CSS globales
shared/                # code pur partagé front + back, rangé par domaine (personal/, professional/, apartments/, transactions/, fiscal/)
server/                # BACKEND — Nitro, mêmes conventions que le server/ de Nuxt
  api/                 # routes HTTP : server/api/health.ts → GET /api/health
    trpc/[...path].ts  # point d'entrée HTTP de tRPC (/api/trpc/*)
  trpc/                # init.ts (contexte, procédures), root.ts (appRouter), routers/<domaine>.ts
  lib/                 # db.ts, env.ts, auth.ts, csv/, categorize/, dashboard/, professional/, apartments/, settings/
  generated/prisma/    # client Prisma généré — gitignoré, ne pas éditer
prisma/                # schema/ (un .prisma par domaine), migrations/, seed.ts + seeds/
prisma.config.ts       # config CLI Prisma 7
```

Pourquoi pas Next.js : app mono-utilisateur derrière une auth, sans SEO. SSR et Server Components n'apportent rien et ajoutent des concepts. Nitro (le moteur serveur de Nuxt) se déploie sur Vercel sans config.

## Frontière front / back

- `src/**` ne peut importer de `server/**` qu'en **`import type`** (ex. le type `AppRouter`). Jamais d'import runtime (Prisma, secrets…) côté front, sinon du code serveur part dans le bundle navigateur.
- `import type` est **obligatoire** pour les types (`verbatimModuleSyntax`).
- Alias : `@/…` → `src/`, `@server/…` → `server/`, `@shared/…` → `shared/` (déclarés dans `vite.config.ts` **et** `tsconfig.json`).
- Vérifié par ESLint (`@typescript-eslint/no-restricted-imports`, `eslint.config.ts`) : `src/` et `shared/` n'importent `@server/…` qu'en `import type` ; `shared/`, `server/`, `prisma/` et `scripts/` n'importent jamais `@/…` (le front).
- `src/lib/i18n/fr/enums.ts` (libellés des enums), `shared/personal/rules.ts` et `envelopes.ts` importent les types de l'enum Prisma depuis `@server/generated/prisma/enums`, en `import type` uniquement.

## API : tRPC + TanStack Query

- Le client (`src/lib/trpc.ts`) est un **singleton de module** : dans une SPA il n'y a qu'un client, pas besoin de Context.
- **superjson** est le transformer des deux côtés : `Date` et autres types survivent au passage serveur → navigateur.
- Les erreurs de validation Zod sont exposées champ par champ dans `error.data.zodError` (utile pour les formulaires).
- `staleTime` par défaut des requêtes : 30 s.

**Lecture** : `useQuery(trpc.<domaine>.<proc>.queryOptions())`, encapsulé dans un hook de feature ; gérer `isPending` / `isError` dans le composant.
**Écriture** : `useMutation(trpc.x.y.mutationOptions())` + invalidation ciblée.
**Interdit** : `fetch` dans un `useEffect`. `useEffect` est réservé à la synchro avec un système externe (ESLint le signale sinon).

**Ajouter une route tRPC** :

1. Créer `server/trpc/routers/<domaine>.ts` (entrées validées par `.input(zodSchema)`).
2. L'enregistrer dans `server/trpc/root.ts`.
3. Côté front, un hook dans `src/features/<domaine>/hooks/`.

Routeurs actuels (tous en `protectedProcedure`) :

- `import` : `detectFormat` (format CSV inconnu → Gemini), `create` (parse + `ImportBatch` et ses `Transaction` en une
  transaction SQL ; `apartmentId` obligatoire pour un compte appartement), `list`, `get`, `validate` (refusé tant qu'une
  ligne est à vérifier), `delete` (cascade).
- `categorize` : `run` (catégorie + confiance par Gemini pour les lignes sans catégorie ; `server/lib/categorize/`).
- `transaction` : `setCategory` (correction manuelle, confiance repassée à `null` = « Confirmée » ; refusé si l'import
  est validé ou si la catégorie n'est pas du type de compte), `setApartment` (rattachement d'une ligne).
- `personal` : `periods`, `overview` (agrégation dans `server/lib/dashboard/aggregate.ts`).
- `settings` : `envelopeShares` / `setEnvelopeShares` (défauts `DEFAULT_ENVELOPE_PERCENTS`), `professionalYear` /
  `professionalYearsConfigured` / `setProfessionalYear` (règles pro par année, héritées de l'année configurée précédente).
- `professional` : `periods`, `month`, `year` (calcul dans `server/lib/professional/`).
- `professionalForecast` : facturation (`billingLines`…), charges (`forecasts`…), salaire (`salary`…), km (`mileage`…),
  chacun avec sa variante `copy…ToFollowingMonths` ; `clients` (noms déjà saisis + dernier TJM).
- `trip` : `create`, `delete`.
- `apartment` : `list`, `options`, `save` (fiche, prêt et solde de début d'année), `delete`
  (refusé si le bien porte des transactions ou des relevés).
- `apartmentDashboard` : `periods` (mois clos), `month`, `year` (calculs purs dans `server/lib/apartments/`).
- `apartmentForecast` : `inputs` / `set` (éditeur du prévisionnel : lignes du mois, et pour un bien géré taux de
  gérance + facture de gérance du mois).

Le filtre « transactions validées d'un type de compte » est partagé : `server/lib/dashboard/scope.ts`. Une ligne est
« à vérifier » si elle n'a pas de catégorie ou si sa confiance est sous 0,7 (`server/lib/categorize/needs-review.ts`).
Sans session : `UNAUTHORIZED` / code `NOT_AUTHENTICATED`.

**Seed** (`prisma/seed.ts`, un fichier par domaine dans `prisma/seeds/`, `pnpm db:seed`, rejoué par `pnpm db:reset`) :
crée le compte unique depuis `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` (inscription HTTP désactivée), les formats CSV
historiques et, pour le dev, des données sur l'année `SEED_YEAR` (2025, `prisma/seeds/seed-year.ts`) : relevés perso,
facturation et trajets Pro, appartements et leurs relevés. Idempotent : il ne crée pas de doublon et n'écrase pas les saisies faites dans l'app. Le barème
de l'IR n'est pas en base : `shared/fiscal/income-tax.ts` (une PR par nouvelle année).

### Calcul du dashboard Pro (`server/lib/professional/`)

- `load-year.ts` : quelques requêtes groupées pour une année (relevés pro et perso validés, facturation, prévisions, trajets, encaissements clients), puis appelle le calcul. Aucune règle métier ici.
- `compute-month.ts` : **fonction pure** (aucun accès base) → `ProfessionalMonth` (chaque valeur est un `ForecastActual` `{ forecast, actual | null }`). `compute-year.ts` enchaîne les 12 mois (TVA payée = TVA due du mois précédent). La vue année = 12 × le calcul du mois.
- `regimes/` : interface `ProfessionalRegime` (rémunération, charges sociales sur bénéfice) ; `sas-ir.ts` est la seule implémentation. Ajouter l'IS ou l'EURL = un fichier + une entrée dans `regimes/index.ts`.
- Reste à encaisser : `load-year.ts` calcule le solde d'ouverture de l'année (facturé TTC réel − encaissements depuis le premier mois facturé), `compute-year.ts` le reporte de mois en mois (`openingReceivablesCents`), `compute-month.ts` l'applique (plancher à 0).
- `allocate-refunds.ts` (remboursements de frais mixtes ligne par ligne), `forecast-values.ts` (valeurs de l'éditeur : saisie, défaut N-1, mois précédent).
- Jours facturés : `BillingLine.days` en `Float`, limité aux multiples de 0,5 (exacts en binaire, validés par tRPC avec `multipleOf`) ; pas, plafond, montant jours × TJM et TJM moyen dans `shared/professional/billing-days.ts`.
- Règles modifiables (TVA par charge, frais mixtes, groupes de l'éditeur, répartition des cotisations) : `shared/professional/rules.ts` ; catégories pro : `shared/transactions/categories.ts`.

## Interface : Mantine + React Router

- **Thème** : `src/lib/theme.ts` (objet `createTheme` + `cssVariablesResolver`) porte les tokens de la maquette — palettes `dark` (obsidian / platine : fond, cartes, bordures, texte), `gold` (accent, index 6 = `#C9A45C`), `amber` (à vérifier / dépassement, index 6 = `#E0894A`), polices (Instrument Serif pour les titres, Manrope pour l'UI), rayons (16 cartes, 10 contrôles, 8 petits boutons). Champs et boutons à 44 px (`src/styles/global.css`). Thème clair et sombre : suit le système par défaut (`defaultColorScheme="auto"`), bouton Système → Clair → Sombre dans la barre latérale ; le script de `index.html` applique le bon thème avant React (pas de flash).
- **Composants** : Mantine (`@mantine/core`, `@mantine/dropzone`), icônes Tabler. CSS sur mesure en CSS Modules. Pas de couleur en dur : tokens Mantine.
- **Routing** : `BrowserRouter` (`main.tsx`) + `<Routes>` (`app.tsx`). `AppLayout` (barre latérale, `<Outlet />`) enveloppe toutes les pages. Routes : `/` (redirige vers `/personal`, pas d'accueil), `/personal`, `/professional`, `/apartments`, `/imports`, `/imports/new`, `/imports/:importId`, `/settings` ; `/login` hors layout. Les liens directs (rechargement de `/imports/new`) marchent grâce au repli SPA de Nitro (vérifié sur `pnpm preview`).
- **Écrans** : après un import, le front enchaîne `import.create` puis `categorize.run` dans une seule mutation et redirige vers la relecture (`/imports/:importId`). `/login` est hors `AppLayout` ; les autres routes sont sous `RequireAuth`.

## Base de données : Prisma 7 + Neon

- Générateur `prisma-client` (client TS sans moteur Rust) sorti dans `server/generated/prisma/` (gitignoré, régénéré par `postinstall`).
- **Deux URLs Neon** : `DATABASE_URL` (pooled, host `-pooler`) pour le runtime via `@prisma/adapter-neon`, `DIRECT_URL` (directe) pour la CLI Prisma et les migrations (`prisma.config.ts`).
- Côté serveur, toujours passer par `db` de `@server/lib/db` (singleton mis en cache sur `globalThis` pour survivre au hot reload).
- **Schéma découpé par domaine** dans `prisma/schema/` (déclaré dans `prisma.config.ts`) : `base` (générateur, datasource), `auth` (Better Auth), `transactions` (imports, formats CSV, transactions, catégories), `personal` (enveloppes), `professional` (Stygma), `apartments`. Prisma les lit comme un seul schéma : une relation peut traverser les fichiers.
- **Toute modif du schéma s'accompagne d'une migration versionnée** dans `prisma/migrations/` (`pnpm db:migrate`).
- `prisma.config.ts` n'utilise volontairement pas `env()` : il lèverait une erreur si la variable manque, ce qui casserait `prisma generate` en CI (pas de DB nécessaire).

### Modèle de données

| Modèle                     | Rôle                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ImportBatch`              | Un fichier de relevé importé (`status` PENDING_REVIEW / VALIDATED, `fileName`, `apartmentId`)        |
| `CsvFormat`                | Format de colonnes d'un export bancaire, retrouvé par l'empreinte de l'en-tête                       |
| `EnvelopeShare`            | Part du revenu (en %) recommandée pour une enveloppe ; sans ligne, la valeur par défaut s'applique   |
| `Transaction`              | Une ligne validée : date, libellé, montant en centimes, catégorie, mois/année                        |
| `ProfessionalYearSettings` | Règles pro d'une année (régime, taux en points de base, surfaces en dm², barème km en millièmes d'€) |
| `BillingLine`              | Jours (par 0,5) × TJM pour un client (`clientName`, texte libre) et un mois, prévu ou réel           |
| `MonthlyForecast`          | Montant prévu d'une catégorie pour un mois (charges pro, BNC, dépenses perso des frais mixtes)       |
| `MileageForecast`          | Km prévus d'un mois                                                                                  |
| `SalaryForecast`           | Salaire brut prévu d'un mois (le réel = le prévu)                                                    |
| `Trip`                     | Trajet du journal des frais km (date, trajet, motif, km)                                             |
| `Apartment`                | Un bien : fiche, gérance, prêt (voir [fonctionnel.md](./fonctionnel.md) › Appartements)              |
| `ApartmentYearOpening`     | Solde du compte appartement au 1er janvier d'une année                                               |
| `ManagementInvoice`        | Facture de gérance d'un mois (frais + frais supplémentaires), saisie à la main                       |

Enums : `AccountType` (PERSONAL / PROFESSIONAL / APARTMENT, sur `ImportBatch` et `Transaction`), `Envelope`, `TransactionCategory` (perso + pro + appartement, voir `shared/transactions/categories.ts`), `ImportStatus`, `CompanyRegime`, `BillingKind`, `ApartmentKind`.

Sans ligne `MonthlyForecast` / `MileageForecast` / `SalaryForecast`, un montant prévu vaut le réel du même mois N-1 (calculé à la lecture, jamais stocké).

Choix à connaître :

- Pas de modèle `BankAccount` : `accountType` est porté directement par `ImportBatch` et `Transaction`. La banque n'est pas stockée : le format CSV est retrouvé par l'empreinte de l'en-tête (`CsvFormat`, voir [import-csv.md](./import-csv.md)).
- Les catégories sont un **enum figé**, pas une table : libellés dans `src/lib/i18n/fr/enums.ts`, enveloppes dans `shared/personal/rules.ts`.
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
- `pnpm check` (lint + ts:check + format + knip), puis `pnpm build` doivent être verts avant `/ship-pr`.
- **ESLint** (config `@vfourny/node-toolkit/eslint/react`, `--max-warnings 0`) : règles des hooks React (`rules-of-hooks`, `exhaustive-deps`, `set-state-in-effect`…), tri des imports / props / interfaces ; `no-console` en warning sauf `warn` / `error`.
- **lefthook** (pre-commit) : ESLint `--fix` puis Prettier sur les fichiers stagés ; (commit-msg) : commitlint. Ne pas contourner avec `--no-verify`.
- **Hook Claude Code** (`.claude/hooks/check.sh`) : Prettier + ESLint `--fix` + `tsc` après chaque édition.
- **CI GitHub Actions** (workflows réutilisables de `vfourny/.github`) : format, lint, knip, ts:check, build sur chaque PR et push sur `main`, plus le titre de PR via commitlint (pas de tests automatisés pour l'instant).
- Nitro 3 est en **beta** : version épinglée exactement dans `package.json`, ne pas la monter sans test.

## Pièges connus

- **Colonne « Solde » en double** dans l'export BoursoBank : on mappe par index de colonne, pas par nom d'en-tête (voir [import-csv.md](./import-csv.md)).
- **`pnpm lint` et `pnpm build`** utilisent des binaires natifs (esbuild, résolveur d'imports d'ESLint) : ne pas les lancer depuis une VM Linux sur un `node_modules` installé sous macOS, et inversement.
