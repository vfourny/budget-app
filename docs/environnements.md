# Environnements & déploiement

## Variables d'environnement

Modèle : `.env.example` (`cp .env.example .env`). Le fichier `.env` n'est jamais commité.

| Variable            | Usage                                                                    | Obligatoire     |
| ------------------- | ------------------------------------------------------------------------ | --------------- |
| `DATABASE_URL`      | URL Neon **pooled** (host `-pooler`), runtime via `@prisma/adapter-neon` | oui             |
| `DIRECT_URL`        | URL Neon **directe**, CLI Prisma (migrations, studio)                    | oui pour la CLI |
| `ANTHROPIC_API_KEY` | Catégorisation des lignes de relevé                                      | plus tard       |

`DATABASE_URL` est validée au démarrage par Zod (`server/lib/env.ts`). Si `DIRECT_URL` est absente, la CLI Prisma retombe sur `DATABASE_URL`, mais les migrations exigent une connexion directe : toujours définir les deux.

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

GitHub Actions (`.github/workflows/ci.yml`) sur chaque PR et push sur `main` : install (`--frozen-lockfile`) → lint → typecheck → format → build. Node vient de `.nvmrc`, pnpm du champ `packageManager`.

## Premier setup et migrations

```bash
cp .env.example .env
pnpm install                  # génère le client Prisma
pnpm db:deploy
```

Faire évoluer le schéma :

```bash
# modifier prisma/schema.prisma, puis :
pnpm db:migrate               # crée + applique la migration sur la branche develop
git add prisma/migrations     # la migration est versionnée avec la PR
```

En production, la migration est appliquée automatiquement au prochain déploiement par `vercel-build`.
