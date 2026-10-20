# Budget App — contexte projet

App perso de budget (méthode des enveloppes) + suivi compta pro de **Stygma SAS**.
Remplace un Google Sheet annuel (`<année>-Comptabilité`, un onglet par mois) rempli à la main
depuis les relevés bancaires. L'historique mois / année est central.

Flux cible : upload d'un relevé CSV → catégorisation par l'IA (Gemini) → relecture/correction
→ validation → écriture en base → dashboards mois/année.

## À lire selon la tâche

- `docs/fonctionnel.md` : règles métier (enveloppes, Pro, Appartements R1-R12). **Avant** de toucher à un calcul.
- `docs/technique.md` : stack, API, calculs, base, pièges connus.
- `docs/decisions.md` : décisions et leurs raisons. **Avant** de remettre un choix en cause ; une nouvelle décision durable s'y ajoute.
- `docs/import-csv.md`, `docs/environnements.md` : import des relevés, déploiement / CI / release.

Ce fichier ne garde que les consignes et la carte du code : une info ne vit qu'à un endroit, le reste renvoie au bon doc.
`pnpm docs:check` (lancé par `pnpm lint`) casse si un chemin cité entre backticks n'existe plus.

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

Choix délibéré : **le plus simple possible**. SPA React 19 + Vite (pas de SSR) et backend Nitro dans le même projet,
tRPC + TanStack Query, Prisma + Neon, Mantine, Better Auth, Gemini. Versions : `docs/technique.md` › Stack ; raisons :
`docs/decisions.md`.

## Commandes

Toutes les commandes et le premier setup : `README.md`. Celles qui comptent pour travailler ici :

```bash
pnpm check          # lint (+ docs:check) + ts:check + format:check + knip + test (à lancer avant toute PR)
pnpm build          # build de prod (fait aussi en CI)
pnpm db:migrate     # toute modif de prisma/schema/ : crée + applique la migration
```

Déploiement, environnements, release (la prod part au merge de la PR de release, pas au merge sur `main`) :
`docs/environnements.md`.

## Architecture

```
src/                   # FRONT — SPA React, tourne uniquement dans le navigateur
  main.tsx             # point d'entrée (createRoot + providers : Query, Router, Mantine)
  app.tsx              # table des routes (React Router)
  pages/               # une page = un écran (assemble un header + des composants de feature)
  features/<domaine>/  # personal, professional, apartments, imports, auth, layout : components/ + hooks/ du domaine (réglages compris)
  components/          # UI partagée entre features (PageHeader, KpiCard…)
  lib/                 # utilitaires front : trpc.ts (client + queryClient), theme.ts (thème Mantine)…
    i18n/fr/           # TOUS les textes de l'UI (dictionnaires typés) + plural.ts (accord en nombre)
  styles/global.css    # règles CSS globales (le thème, lui, est dans lib/theme.ts)
shared/                # code pur partagé front + back, alias @shared/ — rangé par domaine comme server/lib et src/features
  common/              # year-month.util.ts (YearMonth, mois précédent / suivant, mois en cours UTC), period.schema.ts (Zod année / mois)
  transactions/        # categories.rules.ts (catégories par type de compte, « À vérifier », needsReview), csv-format.schema.ts (schéma Zod CsvFormat),
                       # parse-bank-statement / dedupe / statement-checks.calc.ts (import CSV, pur), normalize-label.util.ts
  personal/            # personal.rules.ts (enveloppes, cards, lignes de revenus), aggregate.calc.ts (totaux d'une période), balance.calc.ts (solde)
  professional/        # professional.rules.ts (TVA, frais mixtes, prévisionnel), billing-days.util.ts, compute-month / compute-year.calc.ts (calcul pur du dashboard), amounts.util.ts, regimes/
  apartments/          # apartment.rules.ts (lignes du tableau, tolérances), loan.util.ts (amortissement, rapprochement), compute-month / compute-period / thresholds.calc.ts
  fiscal/              # données légales annuelles : income-tax.rules.ts (barème IR), lmnp.rules.ts (micro-BIC, LMP)
server/                # BACKEND — Nitro, mêmes conventions que le server/ de Nuxt
  api/                 # routes HTTP : server/api/health.ts → GET /api/health
    trpc/[...path].ts  # point d'entrée HTTP de tRPC
  trpc/                # trpc.config.ts (contexte, procédures), app.router.ts (un routeur par domaine), routers/<domaine>.router.ts + <domaine>-<écran>.router.ts imbriqués
  lib/                 # db.client.ts (PrismaClient singleton), env.config.ts (validation Zod des variables)
    professional/      # dashboard Pro : load-year.service (requêtes, puis calcul de shared/professional/), forecast-values.service
    csv/               # import CSV : find-format.service (format connu en base), detect-format.service (Gemini), fingerprint.util
    apartments/        # dashboard Appartements : load-period.service (requêtes) + build-view.service (assemblage, calculs de shared/apartments/)
  generated/prisma/    # client Prisma généré — gitignoré, ne pas éditer
prisma/                # schema/ (un .prisma par domaine), migrations/, seed.ts + seeds/ (un fichier par domaine)
prisma.config.ts       # config CLI Prisma 7 (URL directe pour les migrations)
index.html             # page unique de la SPA
vite.config.ts         # plugins React + Nitro, alias @/ (src) et @server/ (server)
nitro.config.ts        # serverDir: ./server
```

## Conventions

- **Frontière front / back / shared** : `src/**` ne peut importer de `server/**` qu'en `import type`
  (ex. le type du routeur tRPC). Jamais d'import runtime (Prisma, secrets…) côté front.
  Le code utilisé par les deux côtés vit dans `shared/<domaine>/` (alias `@shared/…`) : fonctions pures et
  constantes, sans effet de bord ni accès base / réseau (seule dépendance runtime admise : `zod`), importables
  par `src/` et par `server/`. `shared/` n'importe jamais de `src/` ni de `server/` (sauf `import type`).
  **Vérifié par ESLint** (`@typescript-eslint/no-restricted-imports` dans `eslint.config.ts`) : `src/` et `shared/`
  n'importent du serveur que son **contrat**, en `import type` : `@server/trpc/app.router` (type du routeur) et
  `@server/generated/prisma/*` ; un type d'API vit dans `shared/` ou se déduit du routeur (`RouterOutputs`, `@/lib/trpc`).
  `shared/`, `server/`, `prisma/` et `scripts/` n'importent jamais `@/…`.
- **Règles du budget** (catégories → enveloppes, épargne, catégories de la card « Par catégorie »,
  lignes de revenus, par `key`) : uniquement dans `shared/personal/personal.rules.ts`, jamais en dur ailleurs. Aucun libellé dedans :
  les textes sont dans `@/lib/i18n/fr`. Équivalent pro : `shared/professional/professional.rules.ts` (TVA par charge, frais mixtes, groupes
  du prévisionnel) et `shared/transactions/categories.rules.ts` (catégories proposées par type de compte).
- **Calculs du dashboard Appartements** : même principe, purs et testés dans `shared/apartments/` (`compute-month.calc`, `compute-period.calc`,
  `thresholds.calc`, `period.util`, `loan.util`) ; requêtes dans `server/lib/apartments/load-period.service.ts`, assemblage dans `build-view.service.ts`. Règles (catégorie → ligne du tableau,
  tolérance de rapprochement) dans `shared/apartments/apartment.rules.ts`, seuils LMNP dans `shared/fiscal/lmnp.rules.ts` ; prêt dans `shared/apartments/loan.util.ts`. Référence métier :
  `docs/fonctionnel.md` › Appartements (R1 à R12).
- **Calculs du dashboard Pro** : fonctions **pures** dans `shared/professional/` (`compute-month.calc.ts`, `compute-year.calc.ts`,
  `amounts.util.ts`), donc testées à 100 % ; les requêtes restent dans `server/lib/professional/load-year.service.ts`. Un statut
  juridique = un `ProfessionalRegime` (`shared/professional/regimes/`).
- **Données** : toujours via tRPC + TanStack Query. **Pas de `fetch` dans un `useEffect`.**
  `useEffect` est réservé à la synchro avec un système externe (ESLint le signale sinon).
- **Pattern de lecture** : `useQuery(trpc.<domaine>.<proc>.queryOptions())` avec `trpc` de
  `@/lib/trpc`, encapsulé dans un hook de feature ; gérer `isPending` / `isError` dans le
  composant. Écriture : `useMutation(trpc.x.y.mutationOptions())` + invalidation ciblée.
- **Nouvelle route tRPC** : dans le routeur de son domaine `server/trpc/routers/<domaine>.router.ts` (sous-routeur
  `<domaine>-<écran>.router.ts` imbriqué pour un écran à plusieurs procédures : `professional.forecast`, `apartment.dashboard`…) ;
  un nouveau domaine s'enregistre dans `server/trpc/app.router.ts`. Entrées validées par `.input(zodSchema)`. **Toujours `protectedProcedure`**
  (`server/trpc/trpc.config.ts`, 401 sans session) ; `publicProcedure` seulement pour du contenu public.
  Un routeur reste **mince** : il valide l'entrée, vérifie l'accès (`server/lib/ownership.service.ts` : `findOwnedApartment`,
  `findPendingImport`, `findEditableTransaction`) et délègue à un `server/lib/<domaine>/xxx.service.ts` dès que la procédure
  dépasse une requête simple (orchestration, plusieurs requêtes, calcul).
- **Auth** : Better Auth (`server/lib/auth.config.ts`, monté sur `/api/auth/*`). Inscription publique
  **désactivée** ; l'unique compte est créé par le seed (`pnpm db:seed`, rejoué par `pnpm db:reset`) depuis `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`. Front : `authClient`
  (`@/lib/auth-client`), routes privées sous `RequireAuth` dans `app.tsx`. Les données métier
  (`EnvelopeShare`, `ImportBatch`, `Transaction`) portent un `userId` : **toute requête tRPC filtre sur
  `ctx.session.user.id`** (`findFirst({ where: { id, userId } })` plutôt que `findUnique({ where: { id } })`,
  `userId` à la création). Le barème de l'IR n'est pas en base : donnée légale dans `shared/fiscal/income-tax.rules.ts`,
  une PR par nouvelle année.
- **Données légales annuelles codées en dur** (barème IR, plafond micro-BIC…) : rangées dans `shared/fiscal/` ; toute nouvelle table « par année »
  dans le code se déclare dans `YEARLY_RULES` (`scripts/check-yearly-rules.ts`). `pnpm rules:check [année]` liste
  ce qui manque ; le workflow `yearly-rules.yml` le lance chaque mois, ouvre une issue `yearly-rules`, puis Gemini (secret `GEMINI_API_KEY`, outils lecture / édition / recherche web, ni shell ni git) prépare la PR ; montants à vérifier contre la source avant merge. Volontairement
  hors de `pnpm check` / CI des PR : la loi de finances est parfois votée en février, ça ne doit pas bloquer les PR.
- **Valeurs dérivées** calculées pendant le rendu (≈ `computed`), pas stockées dans un
  `useState` ; `useMemo` seulement si le calcul est coûteux.
- **Hooks custom** (`useXxx`) dans `features/<domaine>/hooks/` dès qu'une logique à état est
  réutilisée ou alourdit un composant (≈ composable Vue).
- **Montants** : entiers en **centimes**, signés (négatif = débit). Jamais de float pour de
  l'argent.
- **Prisma** : côté serveur, toujours passer par `db` de `@server/lib/db.client`. Toute modif de
  schéma (`prisma/schema/*.prisma`, un fichier par domaine : base, auth, transactions, personal, professional, apartments) s'accompagne d'une migration versionnée dans `prisma/migrations/`.
- **Dates** : `Transaction.date` en `@db.Date` ; `month` (1-12) et `year` dénormalisés pour les
  agrégations.
- **Typage des constantes** : pour un objet/tableau de config ou une liste figée, préférer
  `as const satisfies T` à une annotation `: T` — `satisfies` vérifie la forme (clé manquante,
  faute de frappe), `as const` garde les valeurs littérales (autocomplétion, unions dérivées via
  `keyof typeof X` / `(typeof X)[number]`). Pas de `as const` sans dérivation ni autocomplétion
  utile. Un tableau `as const` est readonly : typer les paramètres en `readonly T[]`.
- **Appartenance à une liste `as const`** : `LIST.some((item) => item === value)` plutôt que
  `(LIST as readonly T[]).includes(value)` : même résultat, sans cast.
- **UI** : composants Mantine, thème et tokens de la maquette dans `src/lib/theme.ts` (palettes
  `dark` / `gold` / `amber`, polices, rayons). Pas de couleur en dur dans les composants : utiliser
  les tokens Mantine (`c="gold.6"`, `var(--mantine-color-text)`, `c="dimmed"`…) ou les variables
  `--app-*` (`--app-border`, `--app-hover`, `--app-caption`…). CSS sur mesure en **CSS Modules**
  (`xxx.module.css`, ≈ `<style scoped>` Vue). Thèmes **clair et sombre** (suit le système par défaut,
  bouton Système → Clair → Sombre dans la barre latérale, choix mémorisé par Mantine) : jamais `dark.N` / `--mantine-color-dark-N`
  dans un composant (figé en sombre) ; une couleur qui dépend du thème = une variable dans
  `cssVariablesResolver` (`light` + `dark`).
- **Découpage par domaine** (`personal`, `professional`, `apartments`, `imports`), pas par écran : un composant ou un hook
  va dans la feature du domaine qu'il manipule, même s'il s'affiche dans un écran transverse (Réglages : chaque onglet vient
  de sa feature, `pages/settings-page.tsx` ne fait que les assembler). Pareil côté serveur (`server/lib/<domaine>/`).
- **Ordre d'affichage** : jamais tiré des clés d'un dictionnaire i18n. Ordre métier = une liste dans `shared/` (`categoriesOf`,
  `BUDGET_ENVELOPES`…) ; sinon l'ordre de l'enum (`Object.values(AccountType)`, `@server/generated/prisma/enums` s'importe
  normalement côté front : constantes pures).
- **Routing** : React Router en mode « library » (`BrowserRouter` + `<Routes>` dans `app.tsx`).
  Une nouvelle page = un fichier dans `src/pages/` + une `<Route>` ; s'il faut l'afficher dans le
  menu, l'ajouter à `MAIN_NAV` (`features/layout/components/app-layout.tsx`).
- Validation des entrées : schémas Zod, partagés entre tRPC et formulaires.
- UI en **français**, code/identifiants/commits en **anglais**.
- **Textes de l'UI** : jamais en dur dans un composant ni dans `shared/personal/personal.rules.ts` : ils viennent du
  dictionnaire `fr` de `@/lib/i18n/fr` (`fr.nav.personal`, `fr.categories[category]`…), un fichier par
  domaine (`common`, `nav`, `imports`, `review`, `personal`, `settings`, `enums`, `errors`).
  Pas de lib i18n pour l'instant (une seule langue) : de simples objets `as const`. Texte avec
  variable = fonction (`fr.imports.confirmDelete(n)`) ; pluriels via `plural` / `pluralize`
  (`@/lib/i18n/plural`), jamais de `n > 1 ? "s" : ""` à la main. Libellés d'un enum Prisma :
  `as const satisfies Record<Enum, string>` dans `fr/enums.ts` (`tsc` échoue si une valeur manque).
- **Erreurs serveur** : le serveur n'envoie jamais de texte d'UI, seulement un **code**
  (`throw appError("NOT_FOUND", "IMPORT_NOT_FOUND")`, `server/lib/app-error.util.ts`, codes dans `shared/common/app-error.type.ts` ; pour les lignes
  CSV écartées, un `CsvLineErrorCode`). Le front le traduit via `fr.errors` / `fr.csvErrors`, avec
  `errorMessage(error)` (`@/lib/errors`). Nouveau code = l'ajouter à `AppErrorCode` **et** à
  `fr/errors.ts` (exhaustif).
- **Suffixes de rôle** (nom en kebab-case + suffixe, le rôle se lit sans ouvrir le fichier) : `.router.ts` (routeur tRPC),
  `.service.ts` (logique métier : calculs, requêtes, appels Gemini), `.util.ts` (petit helper pur et générique), `.type.ts`
  (types seuls), `.rules.ts` (règles et données métier : catégories, barèmes…), `.schema.ts` (schéma Zod), `.client.ts`
  (client externe : Prisma, Gemini), `.config.ts` (config / instance : env, Better Auth, init tRPC), `.regime.ts`
  (un `ProfessionalRegime`), `.calc.ts` (calcul métier pur : un mois du dashboard…), `.seed.ts`. Dans `shared/` (pur, voir plus haut) : seulement `.rules`, `.util`, `.schema`, `.type`, `.calc`, `.regime` ; `.service` reste au serveur (requêtes, appels externes). Obligatoire dans `server/lib/`, `server/trpc/`, `shared/` et `prisma/seeds/`
  (`index.ts` exempté), **vérifié par ESLint** (`local/file-suffix` dans `eslint.config.ts`). Pas de suffixe là où le dossier
  dit déjà le rôle : `src/` (`components/`, `hooks/use-xxx.ts`, `pages/xxx-page.tsx`) et `server/api/` (le nom = l'URL Nitro).
- Imports : `@/…` pour `src/`, `@server/…` pour `server/`, `@shared/…` pour `shared/`. `import type` obligatoire pour les
  types (`verbatimModuleSyntax`).
- **Tests unitaires** (Vitest, `vitest.config.ts`, base `@vfourny/node-toolkit/vitest`) : hors du code, dans `tests/` avec la même
  arborescence (`shared/professional/x.util.ts` → `tests/shared/professional/x.util.test.ts`), un projet Vitest par couche.
  Seul `shared` est actif ; `server` et front (`tests/src/`, jsdom + Testing Library) sont décrits dans `vitest.config.ts`.
  API importée explicitement (`import { describe, expect, it } from 'vitest'`, pas de globals). Couverture toujours active.

## Workflow Git / PR

- **Une fonctionnalité = une branche = une PR**, diff court (relisible en quelques minutes).
  Branches : `feat/…`, `fix/…`, `chore/…`. Commits : Conventional Commits **avec scope obligatoire**
  (`feat(import): …`), vérifiés par commitlint (config du toolkit) dans le hook `commit-msg`.
- Si une étape est trop grosse, découpe en **PR empilées** (la PR N+1 cible la branche N).
- Avant toute PR : self-review du diff, `pnpm check` + `pnpm build` verts, puis
  `/ship-pr`. Ne présenter que du vert.
- Remplir `.github/pull_request_template.md`, section « Notes React » incluse.
- CI GitHub Actions : workflows réutilisables de `vfourny/.github` (figés sur un SHA de release). `pr.yml` → `build.yml`
  (format:check, lint, knip, ts:check, build, test) ; `pr-title.yml` → `pr-checks.yml` (titre de PR vérifié par commitlint).
- Hook Git pre-commit (`lefthook.yml`, installé par `pnpm install`) : eslint --fix + Prettier
  sur les fichiers stagés, commit bloqué s'il reste une erreur. Ne pas contourner avec
  `--no-verify` : corriger l'erreur.
- Hook Claude Code (`.claude/hooks/check.sh`) : prettier + eslint --fix + tsc après chaque
  édition ; corrige immédiatement ce qu'il remonte.
- **Release** : release-please (`.github/workflows/release.yml` → `release.yml` de `vfourny/.github`) tient à jour une PR « chore(main): release X.Y.Z »
  (version + `docs/CHANGELOG.md`) ; la merger crée le tag `vX.Y.Z`, et Vercel ne builde en prod que ce commit de release
  (`vercel.json` › `ignoreCommand` → `scripts/vercel-ignore-build.sh`, filtre sur `chore(main): release`). Ne pas
  renommer la PR de release.
- Questions de clarification : **regroupées une fois par feature**. Si ce n'est pas bloquant,
  décide, documente l'hypothèse dans la PR (et ici si durable).

## Slash commands (`.claude/commands/`)

- `/ship-pr` — self-review, checks, commit, push, ouverture de PR.

Créer une nouvelle commande dès qu'un pattern se répète 2-3 fois (ex. ajout d'une route tRPC +
schéma Zod + modèle Prisma, ajout d'un widget dashboard).

Avancement et périmètre : `README.md` › État d'avancement. Décisions : `docs/decisions.md`.
