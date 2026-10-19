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

| Couche      | Choix                                                                                |
| ----------- | ------------------------------------------------------------------------------------ |
| Front       | React 19 (SPA) + Vite 8, TypeScript 6                                                |
| Backend     | Nitro 3 via `nitro/vite` (le moteur serveur de Nuxt) — dossier `server/`             |
| API         | tRPC 11 + Zod 4, TanStack Query 5 (`@trpc/tanstack-react-query`)                     |
| DB          | Prisma 7 + PostgreSQL Neon (driver adapter `@prisma/adapter-neon`)                   |
| UI          | Mantine 9 + React Router 8, thème « obsidian / platine » clair + sombre, accent doré |
| Auth        | Better Auth (email + mot de passe, mono-utilisateur, sessions en base)               |
| IA          | API Gemini (Google AI Studio) pour catégoriser les lignes de relevé                  |
| Hébergement | Vercel (Hobby, détection Nitro automatique) + Neon (Free)                            |
| Qualité     | ESLint, Prettier, `tsc`, commitlint (configs `@vfourny/node-toolkit`)                |

## Commandes

```bash
pnpm dev            # front + API sur un seul serveur (http://localhost:5173, API sous /api)
pnpm check          # lint + ts:check + format:check + knip + test (à lancer avant toute PR)
pnpm test           # tests unitaires Vitest + couverture (rapport HTML dans coverage/)
pnpm test:watch     # Vitest en watch avec l'interface web (Vitest UI, onglet Coverage)
pnpm build          # build de prod (fait aussi en CI) → .output/ (ou .vercel/output sur Vercel)
pnpm preview        # sert le build de prod localement
pnpm lint:fix       # autofix ESLint
pnpm format         # prettier --write

pnpm db:migrate     # prisma migrate dev (crée + applique une migration, régénère le client)
pnpm db:studio      # Prisma Studio
pnpm db:reset       # reset complet de la base dev (supprime tout, rejoue les migrations)
```

Premier setup : `cp .env.example .env` (URLs Neon), `pnpm install` (génère le client Prisma),
`pnpm db:deploy`.

Déploiement Vercel : le script `vercel-build` applique les migrations (`prisma migrate deploy`)
avant `vite build` → `DATABASE_URL` **et** `DIRECT_URL` doivent être définies sur Vercel.
La prod ne se déploie **pas** au merge sur `main` : elle part quand on merge la PR de release
(release-please), voir `docs/environnements.md` › Release.

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
  transactions/        # categories.rules.ts (catégories par type de compte, « À vérifier »), csv-format.schema.ts (schéma Zod CsvFormat)
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

## Roadmap MVP

1. Scaffold (Vite + Nitro + CI + CLAUDE.md) → Prisma/Neon + schéma + seed → tRPC + TanStack Query (fait)
2. Thème obsidian/platine + routing client (fait : Mantine + React Router, menu latéral de la maquette)
3. Upload CSV (parser générique piloté par `CsvFormat`, formats en base) (fait)
4. Route tRPC `categorize` (Gemini, few-shot sur transactions validées, JSON `category` (valeur de l'enum) + `confidence`) (fait)
5. Écran de relecture : historique, tableau de correction, « Valider », suppression d'un import (fait)
6. Dashboard Perso mois / année : totaux, transactions, par catégorie (fait) ; parts recommandées par enveloppe dans Réglages + jauges réel vs recommandé (fait) ; abonnements, IR (à faire)
7. Partie pro Stygma (fait, voir `docs/fonctionnel.md`) : catégories pro, règles par année dans Réglages,
   dashboard mois / année (CA, TVA, bénéfice, facturation & encaissements, catégories, frais mixtes, km), éditeur du
   prévisionnel ; à venir : régimes IS / EURL, TVA à l'encaissement

8. Appartements (fait, voir `docs/fonctionnel.md`) : type de compte `APARTMENT`, Réglages (bien + prêt), import / relecture
   avec rattachement, dashboard `/apartments` mois / année (prévu / réalisé / écart, KPI, rendements, seuils LMNP) ; hors
   périmètre : fiscalité, rappels

Hors scope : synchro bancaire auto, multi-utilisateurs, émission de factures.

## Décisions

- **SPA Vite + Nitro plutôt que Next.js** : app mono-utilisateur derrière une auth, sans SEO ;
  le SSR / les Server Components n'apportent rien ici et ajoutent des concepts. Nitro garde
  les conventions `server/` de Nuxt et se déploie sur Vercel sans config.
- Nitro 3 est encore en **beta** (version épinglée exactement dans `package.json`) ; c'est
  l'approche recommandée par Vercel pour ajouter une API à un projet Vite.
- Neon : `DATABASE_URL` = URL pooled (runtime, adapter `@prisma/adapter-neon`),
  `DIRECT_URL` = URL directe (CLI Prisma / migrations, lue dans `prisma.config.ts`).
- **Pas de modèle `BankAccount`** : seul compte le type **PERSONAL / PROFESSIONAL** (enum `AccountType`, porté par
  `ImportBatch` et `Transaction`). La banque n'est jamais stockée ni codée : le format des colonnes d'un CSV est une
  donnée (`CsvFormat`, `shared/transactions/csv-format.schema.ts`), retrouvée par l'empreinte de l'en-tête du fichier (`server/lib/csv/`),
  donc changer de banque ne demande aucun développement. Les appartements ont leur propre type de compte `APARTMENT` ;
  le rattachement à un bien passe par `apartmentId` (sur `ImportBatch`, défaut de l'import, et sur `Transaction`,
  modifiable ligne par ligne à la relecture), pas par un compte bancaire. Supprimer un `ImportBatch` supprime ses
  transactions.
- **Mantine plutôt que PrimeReact** (décidé le 2026-10-01) : PrimeReact 11 est devenu sans style et
  sous licence PrimeUI (clé à renouveler), la 10 (MIT) n'est plus qu'en maintenance et a des
  couleurs codées en dur à écraser composant par composant. Mantine (MIT) se thématise par un
  objet de thème, fournit AppShell, Select, Dropzone, et `mantine-datatable` pour le tableau
  éditable de la relecture.
- **React Router** (mode library, pas de framework mode) pour le routing client : le plus
  répandu, équivalent direct de Vue Router.
- Prisma 7 stable (la 8 est en RC).
- **Suffixes de rôle sur les fichiers (2026-10-19)** : `.service.ts` plutôt que `.compute.ts` pour la logique métier (couvre
  calculs purs et requêtes) ; règle ESLint locale plutôt qu'`eslint-plugin-check-file` (une vingtaine de lignes, aucune dépendance).
- **Calculs purs dans `shared/` (2026-10-20)** : un calcul métier sans accès base va dans `shared/<domaine>/xxx.calc.ts` plutôt que
  dans un `.service.ts` serveur : il tombe sous le seuil de couverture de 100 % et le front peut le réutiliser. `.service` = I/O.
- **Configs partagées** : `tsconfig.json` étend `@vfourny/node-toolkit/tsconfig/react` (strict + `noUncheckedIndexedAccess`,
  `noEmit`, tout le projet inclus) ; seules les options propres au projet (cible, `types`, alias, `exclude`) restent en local.
  Prettier = config du toolkit telle quelle (guillemets simples, sans point-virgule, 80 colonnes). ESLint =
  `@vfourny/node-toolkit/eslint/react` (tri des imports, props JSX et interfaces, `interface` plutôt que `type`, pas de `!`) ;
  surcharges locales dans `eslint.config.ts` uniquement (routes Nitro en export par défaut, fonctions utilisables avant leur
  déclaration).
- pnpm, une seule app (pas de monorepo).
- **Release (2026-10-16)** : release-please plutôt que semantic-release (config du toolkit) : semantic-release publie
  à chaque push sur `main`, alors qu'on veut choisir le moment du déploiement prod (merge de la PR de release).
  Local + Preview sur la branche Neon `develop`, prod sur `production` ; pas de Docker.
- TypeScript 6.0 (comme le template Vite). **ESLint plutôt qu'oxlint** (décidé le 2026-10-12) : pour partager la config
  du toolkit entre projets ; oxlint était plus rapide mais sans tri des imports ni config partagée.
- **Pro (2026-10-06)** : catégories pro dans l'enum `TransactionCategory` (filtrées par type de compte) plutôt qu'un
  2e enum ; prévisionnel sans saisie = réel du même mois N-1 ; salaire brut prévu mois par mois dans l'éditeur du
  prévisionnel (`SalaryForecast`, sans saisie = brut du même mois N-1 ; réel = prévu, le relevé ne montre que le net),
  cotisations calculées depuis les taux de l'année (les prélèvements URSSAF / PAS… ne comptent pas dans les charges) ; clients en texte libre dans la facturation
  (pas de table) ; jours facturés en `Float` par pas de 0,5 (exact en binaire, pas de demi-journées entières) ; encaissé = crédits `CLIENT_PAYMENT` du mois, reste à encaisser = solde cumulé facturé TTC − encaissé ; graphiques en CSS (pas de lib).
- **Solde du compte perso (2026-10-19)** : pas de solde stocké par mois. On saisit des **repères** (`AccountBalance` :
  solde réel en fin de mois) et le reste se calcule (`shared/personal/balance.calc.ts`, pur) : repère le plus récent +
  transactions validées des mois suivants ; début de mois = fin du mois précédent. Un repère sur un mois l'emporte sur le
  calcul, qui sert alors à afficher l'écart (import manquant, doublon…). Sans repère : solde « non renseigné ». Le solde
  courant des CSV (colonne « Solde » BoursoBank) n'est pas exploité. Les appartements gardent leur solde au 1er janvier
  (`ApartmentYearOpening`).
- **Appartements (2026-10-07)** : trésorerie seulement (pas de fiscalité). Hypothèses retenues : mois clos = antérieur au mois
  en cours ; prévu des charges mensuelles = réel N-1, sinon moyenne des autres mois clos, sinon 0 ; prêt à taux fixe, assurance
  emprunteur prélevée à part (sauf échéance reconnue avec assurance) ; rendement sur le prix d'achat seul ; « Apport appartement »
  (perso) dans l'enveloppe épargne long terme. Le loyer arrive net : les frais viennent de la facture de gérance saisie à la
  main (`ManagementInvoice`), sans effet sur le solde. Une échéance de prêt prélevée est ventilée (intérêts du tableau, capital =
  le reste) pour que le solde calculé reste égal au solde bancaire. Un appartement ne se supprime pas tant qu'il porte des
  transactions ou des relevés (`onDelete: Restrict`).
