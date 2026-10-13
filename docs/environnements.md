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

## CI

Workflows réutilisables de [`vfourny/.github`](https://github.com/vfourny/.github), figés sur le SHA d'une release (Renovate propose les montées de version) :

- `.github/workflows/pr.yml` (chaque PR et push sur `main`) → `build.yml` : install (`--frozen-lockfile`) → format:check → lint → knip → ts:check → build. Chaque script est lancé s'il existe dans `package.json` (`--if-present`) ; pas de script `test` pour l'instant, l'étape est sautée.
- `.github/workflows/pr-title.yml` (PR ouverte, titre modifié…) → `pr-checks.yml` : titre de PR vérifié par commitlint.

Node vient de l'input `node_version` (aligné sur `.nvmrc`), pnpm du champ `packageManager`.

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

En production, la migration est appliquée automatiquement au prochain déploiement par `vercel-build`.
