# Environnements & déploiement

## Variables d'environnement

Modèle : `.env.example` (`cp .env.example .env`). Le fichier `.env` n'est jamais commité.

| Variable             | Usage                                                                                       | Obligatoire      |
| -------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| `DATABASE_URL`       | URL Neon **pooled** (host `-pooler`), runtime via `@prisma/adapter-neon`                    | oui              |
| `DIRECT_URL`         | URL Neon **directe**, CLI Prisma (migrations, studio)                                       | oui pour la CLI  |
| `GEMINI_API_KEY`     | Catégorisation (clé gratuite sur aistudio.google.com)                                       | oui              |
| `GEMINI_MODEL`       | Modèle Gemini (défaut `gemini-3.5-flash-lite`)                                              | non              |
| `BETTER_AUTH_SECRET` | Signature des sessions (≥ 32 car., `openssl rand -base64 32`), une valeur par environnement | oui              |
| `BETTER_AUTH_URL`    | URL publique de l'app (https en prod) ; sinon déduite de la requête                         | non              |
| `SEED_USER_EMAIL`    | Email du compte unique, créé par le seed (`pnpm db:seed`)                                   | oui pour le seed |
| `SEED_USER_PASSWORD` | Mot de passe de ce compte (12 caractères minimum)                                           | oui pour le seed |
| `SEED_USER_NAME`     | Nom affiché du compte                                                                       | non              |

Les variables serveur sont validées au démarrage par Zod (`server/lib/env.ts`). Si `DIRECT_URL` est absente, la CLI Prisma retombe sur `DATABASE_URL`, mais les migrations exigent une connexion directe : toujours définir les deux.

## Bases de données

Pas de Docker. Un projet **Neon** (plan Free) avec deux branches :

| Branche Neon | Utilisée par                             |
| ------------ | ---------------------------------------- |
| `production` | Vercel, environnement « Production »     |
| `develop`    | Développement local + Vercel « Preview » |

Chaque branche a ses propres URLs pooled et directe. Les variables sont saisies à la main dans Vercel (pas d'intégration Neon / Prisma Postgres).

## Déploiement Vercel

- Hébergement Vercel (Hobby) ; le preset Nitro est détecté automatiquement, `server/` devient des Functions.
- Le script `vercel-build` exécute `prisma migrate deploy` **avant** `vite build` : les migrations sont appliquées à chaque déploiement. `DATABASE_URL` **et** `DIRECT_URL` doivent être définies sur Vercel.
- Sortie du build : `.output/` en local, `.vercel/output` sur Vercel.
- **Production Branch Vercel = `production`** (branche Git avancée uniquement par le workflow de release, voir ci-dessous). Un push sur `main` ne déploie donc pas la prod : il produit un déploiement Preview, comme une PR.

| Déclencheur               | Environnement Vercel | Branche Neon |
| ------------------------- | -------------------- | ------------ |
| `pnpm dev`                | — (local)            | `develop`    |
| PR ou push sur `main`     | Preview              | `develop`    |
| Merge de la PR de release | Production           | `production` |

## Release

[release-please](https://github.com/googleapis/release-please) via le workflow réutilisable `release-please.yml` de `vfourny/.github` (appelé par `.github/workflows/release.yml`, config `release-please-config.json` + `.release-please-manifest.json`) :

1. Chaque push sur `main` crée ou met à jour une PR « chore(main): release X.Y.Z » : version de `package.json` et `docs/CHANGELOG.md`, calculées depuis les Conventional Commits (`feat` → minor, `fix` → patch, `!` → major ; `chore`, `ci`, `docs`… ne déclenchent pas de release).
2. Merger cette PR = déployer : le workflow crée le tag `vX.Y.Z` + la GitHub Release, puis pousse le commit sur la branche `production` (fast-forward) → Vercel déploie la prod, `vercel-build` applique les migrations sur la branche Neon `production`.

Pré-requis :

- Secrets `SEMANTIC_BOT_CLIENT_ID` / `SEMANTIC_BOT_PRIVATE_KEY` : la GitHub App de `vfourny/.github`, installée sur ce repo (Contents, Issues, Pull requests en écriture). Avec `GITHUB_TOKEN`, la PR de release ne déclencherait pas la CI.
- Branche `production` protégée sur GitHub (pas de push direct ni de force-push, la GitHub App en bypass) ; elle ne bouge que par le workflow.
- `docs/CHANGELOG.md` et le manifest sont écrits par release-please : exclus de Prettier (`.prettierignore`).

Retour arrière : « Instant Rollback » Vercel pour le code. Une migration n'est **pas** annulée par un rollback : restaurer la branche Neon `production` à un instant T (fenêtre courte sur le plan Free), d'où l'intérêt de tester une migration destructive sur la Preview avant de merger la release.

Pourquoi release-please et pas semantic-release (pourtant fourni par `@vfourny/node-toolkit/release`) : semantic-release publie à chaque push sur `main`, donc chaque merge partirait en prod ; la PR de release de release-please sert de bouton « je déploie » et montre le CHANGELOG avant.

## CI

Workflows réutilisables de [`vfourny/.github`](https://github.com/vfourny/.github), figés sur le SHA d'une release (Renovate propose les montées de version) :

- `.github/workflows/pr.yml` (chaque PR et push sur `main`) → `build.yml` : install (`--frozen-lockfile`) → format:check → lint → knip → ts:check → build. Chaque script est lancé s'il existe dans `package.json` (`--if-present`) ; pas de script `test` pour l'instant, l'étape est sautée.
- `.github/workflows/pr-title.yml` (PR ouverte, titre modifié…) → `pr-checks.yml` : titre de PR vérifié par commitlint.
- `.github/workflows/pr.yml` → `prisma-check.yml` : rejoue les migrations sur un Postgres vide (service du job, jamais Neon) puis `prisma migrate diff --exit-code` contre `prisma/schema/` ; échoue si le schéma a changé sans migration (`pnpm db:migrate` oublié). Lancé sur chaque PR, sans filtre `paths`, pour pouvoir être un check obligatoire.

Node vient de l'input `node_version` (aligné sur `.nvmrc`), pnpm du champ `packageManager`.

## Renovate

`renovate.json` étend le preset partagé `github>vfourny/.github` (actions figées sur un SHA, 3 jours d'attente avant de proposer une version, majeures relues à la main). Surcharges locales : une fusion sur `main` part en prod à la release suivante, sans tests, donc les `dependencies` (runtime) et Nitro (beta épinglée) ne sont **jamais** fusionnées automatiquement ; seules les patch/minor des `devDependencies` le sont (lundi 0 h–4 h). `prisma`, `@prisma/client` et `@prisma/adapter-neon` montent ensemble. L'app GitHub Renovate doit être installée sur le repo.

## Premier setup et migrations

```bash
cp .env.example .env
pnpm install                  # génère le client Prisma
pnpm db:deploy
pnpm db:seed                  # compte unique, formats CSV, données de dev
```

Faire évoluer le schéma :

```bash
# modifier le fichier du domaine dans prisma/schema/, puis :
pnpm db:migrate               # crée + applique la migration sur la branche develop
git add prisma/migrations     # la migration est versionnée avec la PR
```

En production, la migration est appliquée automatiquement par `vercel-build` à la prochaine release (merge de la PR de release).
