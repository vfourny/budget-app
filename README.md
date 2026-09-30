# Budget App

App perso de budget (méthode des enveloppes) + suivi comptable pro de **Stygma SAS**.
Elle remplace un Google Sheet annuel (`<année>-Comptabilité`, un onglet par mois) rempli à la main depuis les relevés bancaires.

Flux cible : **upload d'un relevé CSV → catégorisation par l'API Claude → relecture / correction → validation → écriture en base → dashboards mois / année**.

> Projet mono-utilisateur, fait aussi pour apprendre React (développeur venant de Vue/Nuxt).

## Stack

| Couche      | Choix                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Front       | React 19 (SPA) + Vite 8, TypeScript 6                                        |
| Backend     | Nitro 3 (`nitro/vite`, dossier `server/`, conventions Nuxt)                  |
| API         | tRPC 11 + Zod 4, TanStack Query 5                                            |
| DB          | Prisma 7 + PostgreSQL Neon (`@prisma/adapter-neon`)                          |
| UI          | Mantine 9 + React Router 8, thème sombre « obsidian / platine », accent doré |
| Auth        | Better Auth (mono-utilisateur) — pas encore en place                         |
| IA          | API Anthropic (catégorisation des lignes de relevé)                          |
| Hébergement | Vercel (Hobby) + Neon (Free)                                                 |
| Qualité     | oxlint, Prettier, `tsc`, lefthook, GitHub Actions                            |

## Démarrage rapide

Prérequis : Node ≥ 22 (voir `.nvmrc`) et pnpm 10.

```bash
cp .env.example .env        # renseigner les URLs Neon (et la clé Anthropic plus tard)
pnpm install                # génère aussi le client Prisma (postinstall) + installe les hooks git
pnpm db:deploy && pnpm db:seed
pnpm dev                    # front + API sur http://localhost:5173 (API sous /api)
```

## Commandes

| Commande          | Rôle                                                         |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Front + API sur un seul serveur                              |
| `pnpm check`      | lint + typecheck + format:check (avant toute PR)             |
| `pnpm build`      | Build de prod (`.output/`, ou `.vercel/output` sur Vercel)   |
| `pnpm preview`    | Sert le build de prod localement                             |
| `pnpm lint:fix`   | Autofix oxlint                                               |
| `pnpm format`     | `prettier --write`                                           |
| `pnpm db:migrate` | `prisma migrate dev` (crée + applique une migration)         |
| `pnpm db:deploy`  | `prisma migrate deploy` (applique les migrations existantes) |
| `pnpm db:seed`    | Seed idempotent (comptes bancaires)                          |
| `pnpm db:studio`  | Prisma Studio                                                |

## Documentation

Tout est dans [`docs/`](./docs) :

- [Règles fonctionnelles](./docs/fonctionnel.md) — enveloppes, catégories, comptes, cycle de vie d'un import, règles de calcul.
- [Spécificités techniques](./docs/technique.md) — architecture, conventions, pièges à connaître.
- [Import CSV](./docs/import-csv.md) — parseur générique, formats BoursoBank / Banque Populaire, ajouter une banque.
- [Environnements & déploiement](./docs/environnements.md) — branches Neon, variables, Vercel, CI.

Les conventions de travail (workflow PR, consignes pour Claude Code) sont dans [`CLAUDE.md`](./CLAUDE.md).

## État d'avancement

Fait : scaffold, Prisma/Neon + schéma + seed, tRPC + TanStack Query, parseur CSV générique avec mapping par banque.
À venir : écran de relecture, dashboards mois / année, puis partie pro Stygma (TVA, facturation, prévisionnel/réel).
Hors scope v1 : synchro bancaire automatique, multi-utilisateurs, facturation / TVA.
