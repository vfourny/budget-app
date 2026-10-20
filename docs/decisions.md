# Décisions

Pourquoi le projet est fait comme ça. Une décision qui change : la mettre à jour ici (avec la date), pas ailleurs.

## Stack et outillage

- **SPA Vite + Nitro plutôt que Next.js** : app mono-utilisateur derrière une auth, sans SEO ;
  le SSR / les Server Components n'apportent rien ici et ajoutent des concepts. Nitro garde
  les conventions `server/` de Nuxt et se déploie sur Vercel sans config.
- Nitro 3 est encore en **beta** (version épinglée exactement dans `package.json`) ; c'est
  l'approche recommandée par Vercel pour ajouter une API à un projet Vite.
- Neon : `DATABASE_URL` = URL pooled (runtime, adapter `@prisma/adapter-neon`),
  `DIRECT_URL` = URL directe (CLI Prisma / migrations, lue dans `prisma.config.ts`).
- **Mantine plutôt que PrimeReact** (2026-10-01) : PrimeReact 11 est devenu sans style et
  sous licence PrimeUI (clé à renouveler), la 10 (MIT) n'est plus qu'en maintenance et a des
  couleurs codées en dur à écraser composant par composant. Mantine (MIT) se thématise par un
  objet de thème, fournit AppShell, Select, Dropzone, et `mantine-datatable` pour le tableau
  éditable de la relecture.
- **React Router** (mode library, pas de framework mode) pour le routing client : le plus
  répandu, équivalent direct de Vue Router.
- Prisma 7 stable (la 8 est en RC).
- pnpm, une seule app (pas de monorepo).
- TypeScript 6.0 (comme le template Vite). **ESLint plutôt qu'oxlint** (2026-10-12) : pour partager la config
  du toolkit entre projets ; oxlint était plus rapide mais sans tri des imports ni config partagée.
- **Configs partagées** : `tsconfig.json` étend `@vfourny/node-toolkit/tsconfig/react` (strict + `noUncheckedIndexedAccess`,
  `noEmit`, tout le projet inclus) ; seules les options propres au projet (cible, `types`, alias, `exclude`) restent en local.
  Prettier = config du toolkit telle quelle (guillemets simples, sans point-virgule, 80 colonnes). ESLint =
  `@vfourny/node-toolkit/eslint/react` (tri des imports, props JSX et interfaces, `interface` plutôt que `type`, pas de `!`) ;
  surcharges locales dans `eslint.config.ts` uniquement (routes Nitro en export par défaut, fonctions utilisables avant leur
  déclaration, frontières d'import, suffixes de rôle).
- **Release (2026-10-16)** : release-please plutôt que semantic-release (config du toolkit) : semantic-release publie
  à chaque push sur `main`, alors qu'on veut choisir le moment du déploiement prod (merge de la PR de release).
  Local + Preview sur la branche Neon `develop`, prod sur `production` ; pas de Docker.

## Organisation du code

- **Suffixes de rôle sur les fichiers (2026-10-19)** : règle ESLint locale plutôt qu'`eslint-plugin-check-file` (une vingtaine
  de lignes, aucune dépendance).
- **Calculs purs dans `shared/` (2026-10-20)** : un calcul métier sans accès base va dans `shared/<domaine>/xxx.calc.ts` plutôt que
  dans un `.service.ts` serveur : il tombe sous le seuil de couverture de 100 % et le front peut le réutiliser. `.service` = I/O
  (requêtes, appels externes). Remplace la décision du 2026-10-19 (« `.service` couvre calculs purs et requêtes »).
- **Contrat d'API (2026-10-20)** : le front et `shared/` ne voient du serveur que le type du routeur tRPC et le client Prisma
  généré (types, enums). Un type d'API vit dans `shared/` ou se déduit du routeur (`RouterOutputs`) ; vérifié par ESLint.
- **Découpage par domaine (2026-10-20)** : `personal`, `professional`, `apartments`, `imports`, partout (features, `server/lib`,
  routeurs tRPC imbriqués), plutôt que par écran (`settings`, `review`, `dashboard`). Un écran transverse (Réglages) assemble
  les composants de chaque domaine.
- **Une info à un seul endroit (2026-10-20)** : consignes et carte du code dans `CLAUDE.md`, explications techniques dans
  `docs/technique.md`, règles métier dans `docs/fonctionnel.md`, décisions ici ; `pnpm docs:check` (lancé par `pnpm lint`)
  casse si un chemin cité n'existe plus.

## Métier

- **Pas de modèle `BankAccount`** : seul compte le type **PERSONAL / PROFESSIONAL / APARTMENT** (enum `AccountType`, porté par
  `ImportBatch` et `Transaction`). La banque n'est jamais stockée ni codée : le format des colonnes d'un CSV est une
  donnée (`CsvFormat`, `shared/transactions/csv-format.schema.ts`), retrouvée par l'empreinte de l'en-tête du fichier (`server/lib/csv/`),
  donc changer de banque ne demande aucun développement. Le rattachement à un appartement passe par `apartmentId` (sur
  `ImportBatch`, défaut de l'import, et sur `Transaction`, modifiable ligne par ligne à la relecture), pas par un compte
  bancaire. Supprimer un `ImportBatch` supprime ses transactions.
- **Pro (2026-10-06)** : catégories pro dans l'enum `TransactionCategory` (filtrées par type de compte) plutôt qu'un
  2e enum ; prévisionnel sans saisie = réel du même mois N-1 ; salaire brut prévu mois par mois dans l'éditeur du
  prévisionnel (`SalaryForecast`, sans saisie = brut du même mois N-1 ; réel = prévu, le relevé ne montre que le net),
  cotisations calculées depuis les taux de l'année (les prélèvements URSSAF / PAS… ne comptent pas dans les charges) ;
  clients en texte libre dans la facturation (pas de table) ; jours facturés en `Float` par pas de 0,5 (exact en binaire,
  pas de demi-journées entières) ; encaissé = crédits `CLIENT_PAYMENT` du mois, reste à encaisser = solde cumulé facturé
  TTC − encaissé ; graphiques en CSS (pas de lib).
- **Appartements (2026-10-07)** : trésorerie seulement (pas de fiscalité). Hypothèses retenues : mois clos = antérieur au mois
  en cours ; prévu des charges mensuelles = réel N-1, sinon moyenne des autres mois clos, sinon 0 ; prêt à taux fixe, assurance
  emprunteur prélevée à part (sauf échéance reconnue avec assurance) ; rendement sur le prix d'achat seul ; « Apport appartement »
  (perso) dans l'enveloppe épargne long terme. Le loyer arrive net : les frais viennent de la facture de gérance saisie à la
  main (`ManagementInvoice`), sans effet sur le solde. Une échéance de prêt prélevée est ventilée (intérêts du tableau, capital =
  le reste) pour que le solde calculé reste égal au solde bancaire. Un appartement ne se supprime pas tant qu'il porte des
  transactions ou des relevés (`onDelete: Restrict`).
- **Solde du compte perso (2026-10-19)** : pas de solde stocké par mois. On saisit des **repères** (`AccountBalance` :
  solde réel en fin de mois) et le reste se calcule (`shared/personal/balance.calc.ts`, pur) : repère le plus récent +
  transactions validées des mois suivants ; début de mois = fin du mois précédent. Un repère sur un mois l'emporte sur le
  calcul, qui sert alors à afficher l'écart (import manquant, doublon…). Sans repère : solde « non renseigné ». Le solde
  courant des CSV (colonne « Solde » BoursoBank) n'est pas exploité. Les appartements gardent leur solde au 1er janvier
  (`ApartmentYearOpening`).
- **Mois en cours en UTC (2026-10-20)** : front et serveur prennent le mois en cours en UTC (`currentYearMonth`,
  `shared/year-month.util.ts`), comme les dates métier (`@db.Date`).
