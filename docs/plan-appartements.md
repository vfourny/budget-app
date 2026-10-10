# Plan d'action — Appartements (LMNP)

> **Statut : réalisé** (PR 1 à 8, branches empilées `feat/apartment-model` → `chore/apartments-docs`). Écarts avec ce
> plan : l'échéance de prêt prélevée est ventilée avec le capital = montant − intérêts − assurance (le solde reste égal au
> solde bancaire, l'écart d'arrondi ≤ 1 € va dans le capital) ; la jauge « capital remboursé » est plafonnée au dernier mois
> clos ; les tables `ApartmentYearOpening` et `ManagementInvoice` portent aussi `userId`.
>
> Rédigé le 2026-10-07 à partir de la maquette (canvas Claude Design « Budget — maquette MVP », artboards
> **Appartements**, **Réglages** et **Relecture**), de `CLAUDE.md`, `docs/` et du code de `main` (493001b).
> Objectif : livrer l'écran `/apartments` en **PR courtes empilées**, en réutilisant l'existant (relecture,
> dashboard Pro, `shared/`, i18n).
>
> Ce document est la **référence des règles métier** de la fonctionnalité : en cas de doute pendant le
> développement, c'est lui qui tranche (la maquette contient des données fictives, voir § 9).

## 1. Périmètre

**Ce que fait la fonctionnalité** : suivre la **trésorerie** de chaque appartement en louant, comme l'onglet
« Toulouse » de l'Excel actuel : loyers perçus, gérance, crédit, charges, solde, avec un tableau
**Prévisionnel / Réalisé / Écart** par bien. Une comptabilité de trésorerie simplifiée pour un non-comptable.

**Ce qu'elle ne fait pas** (décidé, ne pas réintroduire) :

- aucune **fiscalité** : pas de résultat fiscal, d'amortissement, de déficit reportable, de régime micro-BIC / réel,
  pas de terrain / frais d'acquisition / mobilier. La déclaration reste du ressort du comptable ;
- aucun **rappel** (taxe foncière, CFE, liasse, IRL, DPE, INPI…) : la carte « Échéances et démarches » est abandonnée ;
- aucun indicateur « Différentiel généré », « Solde » ou « Charges et crédit » en KPI (ils restent des lignes du tableau).

**Le régime de location** (LMNP / location nue / SCI) est une simple **étiquette** par appartement en V1 (aucune règle ne
dépend de lui). On pourra y accrocher des règles plus tard.

**Compte bancaire dédié** : les appartements ont **leur propre compte bancaire**, différent du compte perso. Le relevé
est importé à part, avec un nouveau type de compte **Appartement** (à côté de Perso et Pro), et chaque ligne est
rattachée à un appartement. Le « Solde » de l'Excel est donc le **vrai solde de ce compte**. Les virements d'apport du
perso vers ce compte existent des deux côtés (voir R11).

## 2. Ce que montre la maquette

### Dashboard `/apartments` (vue mois / année)

| Bloc                  | Contenu                                                                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| En-tête               | « Appartements · vue du mois / de l'année », titre (mois + année), **Ajouter un appartement** (→ Réglages), bascule Mois / Année, flèches                                                                                           |
| Pastilles             | « Tous (n) » + une pastille par appartement actif sur la période                                                                                                                                                                    |
| 2 KPI                 | **Loyers nets perçus** (+ jauge perçus / dus) et **Effort d'épargne nécessaire** (+ jauge apporté / nécessaire)                                                                                                                     |
| Carte par appartement | Nom, étiquette de régime, sous-titre (« Géré par X » ou « En direct », date d'acquisition, prix), puces **Rendement brut / net** (vue année seulement), jauge **Capital remboursé**, bouton **Réglages**, puis le tableau (§ 3, R2) |
| Seuils LMNP (année)   | 2 jauges sur les recettes de l'année, tous appartements confondus : plafond micro-BIC et seuil LMP                                                                                                                                  |
| Transactions (mois)   | Transactions rattachées aux appartements affichés : date, libellé, appartement, catégorie, montant                                                                                                                                  |

### Réglages › onglet « Appartements » (`/settings?tab=apt`)

Une carte par appartement : régime (étiquette), nom, gérant (vide = en direct), date d'acquisition (mm/aaaa),
prix d'achat, loyer prévu, dépôt de garantie, taxe foncière (€/an), CFE (€/an), solde de début d'année ; bloc
**Prêt immobilier** (capital emprunté, taux annuel, durée en mois, première échéance, assurance de l'emprunt en €/mois)
avec un encadré de synthèse calculé (mensualité, première échéance en capital / intérêts, coût total des intérêts).
Boutons « Ajouter un appartement » et « Enregistrer ».

**Frais de gérance (%)** est saisi dans la carte de l'appartement (il sert au prévisionnel uniquement : le réel vient de la facture
de gérance du mois, saisie dans le dashboard, R12). Les charges mensuelles prévues ne se saisissent pas en V1 (voir R3).

### Import et relecture

L'import propose un type de compte **Appartement** et, dans ce cas, un select **Appartement** (rattachement par défaut du relevé). La
relecture affiche une colonne **Appartement** (modifiable par ligne) **uniquement pour un relevé appartement**. Quand une ligne de
prêt correspond à l'échéance attendue, une mention verte l'indique (R7). Côté perso, le virement vers le compte appartement se
catégorise « Apport appartement ».

## 3. Règles métier

> Montants en **centimes** (entiers, signés : négatif = débit). Dates : mois civils. Aucun float pour de l'argent
> (taux en points de base : 3,00 % = `300`).

### R1 — Appartement, période d'activité

- Un appartement est **actif** à partir de son mois d'acquisition (`acquiredAt`, mois inclus). Avant, il n'apparaît
  ni dans les pastilles, ni dans les totaux, ni dans les seuils.
- Un mois est **clos** quand il est **antérieur au mois en cours** (hypothèse H1). Le prévisionnel d'un mois non clos
  existe, mais la vue ne propose que les mois clos (comme le dashboard Pro propose les mois avec relevé).
- La vue affiche les appartements actifs sur la période choisie, filtrés par la pastille.

### R2 — Les lignes du tableau et leur source

Le tableau d'un appartement a 3 colonnes : **Prévisionnel**, **Réalisé**, **Écart**. Le **réalisé** vient des
transactions **validées** rattachées à l'appartement (`Transaction.apartmentId`), par catégorie. Montants affichés en
positif pour les charges (signe porté par la ligne).

| Section           | Ligne                                    | Réalisé = somme des transactions de catégorie…                                      | Prévisionnel                                        |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| Solde             | Solde début de mois / d'année            | calcul (R5)                                                                         | identique au réalisé                                |
|                   | Différentiel généré                      | calcul (R5)                                                                         | calcul sur le prévu                                 |
|                   | Apport fonds perso                       | `APT_OWNER_CONTRIBUTION` (crédits sur l'appartement)                                | = effort d'épargne prévu                            |
|                   | Solde fin de mois / à ce jour            | calcul (R5)                                                                         | calcul sur le prévu                                 |
| Loyers            | Loyers bruts (perçus + frais de gérance) | `APT_RENT_RECEIVED` (loyer **net** reçu) **+** frais de la facture de gérance (R12) | loyer prévu (Réglages)                              |
|                   | Frais de gérance                         | facture de gérance saisie (R12)                                                     | loyer prévu × % de gérance                          |
|                   | Frais de gérance supplémentaires         | facture de gérance saisie (R12)                                                     | 0                                                   |
| Crédit            | Capital remboursé                        | ventilation de l'échéance par le tableau d'amortissement (R6/R7)                    | idem (échéance attendue)                            |
|                   | Intérêts                                 | idem                                                                                | idem                                                |
|                   | Assurance emprunteur                     | `APT_LOAN_INSURANCE`                                                                | assurance saisie (Réglages)                         |
|                   | Total remboursement crédit               | capital + intérêts + assurance                                                      | idem                                                |
|                   | Effort d'épargne nécessaire              | R5                                                                                  | R5 sur le prévu                                     |
| Charges fixes     | Électricité                              | `ENERGY`                                                                            | R3                                                  |
|                   | Assurance habitation                     | `APT_HOME_INSURANCE`                                                                | R3                                                  |
|                   | Box internet                             | `INTERNET`                                                                          | R3                                                  |
|                   | Charges de copropriété                   | `APT_CONDO_FEES`                                                                    | R3                                                  |
| Charges annuelles | Taxe foncière / CFE                      | `APT_PROPERTY_TAX` / `APT_CFE`                                                      | montant annuel, compté **le mois de paiement** (R3) |
| Autres charges    | Frais bancaires                          | `APT_BANK_FEES`                                                                     | R3                                                  |
|                   | Régularisation de charges                | `APT_REGULARIZATION`                                                                | 0                                                   |
|                   | Autres (non listé)                       | `APT_OTHER`                                                                         | 0                                                   |
| Hors résultat     | Dépôt de garantie à restituer            | (valeur des Réglages, pas une transaction)                                          | idem                                                |

Règles d'affichage : la section « Charges annuelles » n'apparaît en vue mois que si le mois en contient ; le
« Dépôt de garantie » n'apparaît qu'en vue année ; un montant nul s'affiche « — ».

**Ligne = −(somme des montants signés)** pour une charge : un remboursement de régularisation (crédit) vient en
diminution de la ligne.

### R3 — Prévisionnel

- **Loyer** : `rentCents` de l'appartement (brut). **Gérance** : `rentCents × managementFeeBps / 10 000`. Loyer net attendu = loyer − gérance.
  **Assurance emprunteur** : `creditInsuranceCents`. **Crédit** : échéance du tableau d'amortissement (R6).
- **Taxe foncière** : `propertyTaxCents` compté en **octobre** ; **CFE** : `cfeCents` compté en **décembre**
  (même règle pour le réel : la transaction est comptée dans son mois de paiement, pas lissée).
- **Charges mensuelles** (électricité, assurance habitation, box, copropriété, frais bancaires) : sans saisie,
  prévu = **réel du même mois N-1** ; à défaut, **moyenne des mois clos** de l'appartement ; à défaut, 0 (hypothèse H2,
  même principe que le prévisionnel Pro). Pas d'éditeur de prévisionnel en V1.
- Le prévu de la **vacance / impayé** n'existe pas : le prévu suppose le loyer intégralement perçu.

### R4 — Réalisé et mois clos

Une transaction compte dans le réalisé si son import est **VALIDATED**, son `apartmentId` est renseigné et son mois
est celui de la période. Une transaction rattachée sans catégorie compte en « Autres » (`APT_OTHER`) et reste signalée
« À vérifier » comme ailleurs.

### R5 — Différentiel, effort d'épargne, apport, solde

Pour un mois et un appartement :

```
différentiel = loyer net reçu − capital − intérêts − assurance emprunteur
               − régularisation − charges fixes − frais bancaires − autres − taxe foncière − CFE
effort d'épargne nécessaire = max(0, −différentiel)
solde fin de mois = solde début de mois + différentiel + apport fonds perso
```

- **Solde début d'année** : saisi à la main chaque année (`ApartmentYearOpening`, comme dans le tableur), 0 à défaut.
  Le solde début de mois = solde début d'année + Σ (différentiel + apport) des mois précédents (de l'année, ou depuis
  l'acquisition l'année d'achat).
- **Vue année** : colonnes calculées sur les **mêmes mois clos** pour le prévu et le réalisé (l'écart compare des
  périodes identiques). **L'effort annuel = somme des efforts mensuels** (un mois excédentaire ne compense pas un mois
  déficitaire), jamais `max(0, −différentiel annuel)`.
- **Écart = réalisé − prévisionnel** sur des montants signés : négatif = défavorable (orange), positif = favorable
  (vert), nul = « — ».

### R6 — Prêt

`shared/apartment-loan.ts` : fonction **pure** `loanSchedule({ principalCents, rateBps, termMonths, firstDueDate })`
(prêt **à taux fixe**, hypothèse H3) qui renvoie, par échéance : `dueDate`, `paymentCents`, `interestCents`,
`capitalCents`, `balanceCents`.

- Mensualité = `round(P × i / (1 − (1 + i)^−n))`, `i = rateBps / 10 000 / 12`.
- Intérêts d'une échéance = `round(capital restant × i)` ; capital = mensualité − intérêts ; la **dernière** échéance
  solde le capital restant.
- L'**assurance emprunteur** est à part (`creditInsuranceCents`, montant mensuel fixe) : elle n'entre pas dans la
  mensualité ni dans le capital / les intérêts.
- **Capital remboursé (jauge de la carte)** = Σ des capitaux des échéances jusqu'à la fin de la période affichée, sur
  le capital emprunté (« 15 368 € sur 166 357 € · 9,2 % »). Calculé d'après le tableau, indépendamment des transactions.
- Le résumé des Réglages affiche mensualité, 1ʳᵉ échéance (capital / intérêts) et coût total des intérêts.

### R7 — Rapprochement d'une échéance de prêt

À l'import / à la relecture, une transaction de catégorie `APT_LOAN_REPAYMENT` rattachée à l'appartement est comparée à
l'échéance attendue du mois (R6) :

- **Reconnue** si `|montant − mensualité| ≤ 1 €` (100 centimes, décidé), **ou** `|montant − (mensualité + assurance)| ≤ 1 €`
  quand l'assurance est prélevée avec l'échéance (hypothèse H4 : par défaut l'assurance est prélevée à part). La ligne
  est alors **ventilée** : capital et intérêts viennent du tableau.
- **Non reconnue** : la ligne est signalée à la relecture (« Échéance du prêt non reconnue : attendu X € ») ; dans le
  dashboard, les intérêts restent ceux du tableau et le **capital = montant réel − intérêts** (le montant payé
  reste exact).
- Pas de ventilation stockée sur la transaction : elle se recalcule à la lecture (`server/lib/apartments/`).

### R8 — KPI

- **Loyers nets perçus** = somme des virements de loyer **reçus** (`APT_RENT_RECEIVED`, déjà nets de gérance ; période, mois clos). Sous-titre :
  « X perçus sur Y dus (Z %) · gérance W » : X = loyers **bruts** (net + frais, R12), W = frais saisis. **Loyers dus** = loyer prévu brut × nombre de mois clos actifs.
  **Jauge** : barre = perçus, repère = dus ; orange si perçus < dus (« Il manque X de loyers »), verte sinon.
- **Effort d'épargne nécessaire** = Σ des efforts (R5), tous appartements affichés. Sous-titre : vue mois « À apporter ce
  mois-ci… · prévu X » ; vue année « Soit X par mois en moyenne · prévu Y » ; si l'effort est nul : « Aucun apport
  nécessaire : le bien s'autofinance… ». **Jauge** : barre = apport fonds perso réel, repère = effort nécessaire ;
  verte si apport ≥ effort (« couvre l'effort (+X) »), orange sinon (« il manque X »).

### R9 — Rendements (vue année seulement)

Un mois seul est trop irrégulier (vacance, taxe foncière) : les rendements n'existent qu'en vue année, par appartement.

- **Brut** = (loyers perçus ÷ nombre de mois clos × 12) ÷ prix d'achat.
- **Net** = ((loyers perçus − charges hors crédit) ÷ nombre de mois clos × 12) ÷ prix d'achat, où les charges hors crédit
  = gérance, régularisation, charges fixes, frais bancaires, autres, taxe foncière, CFE (hors capital, intérêts, assurance
  emprunteur). Le prix d'achat est le seul dénominateur (hors frais, hypothèse H5).

### R10 — Seuils LMNP (vue année seulement)

Recettes = Σ des loyers perçus de tous les appartements **actifs LMNP**, de janvier au dernier mois clos de l'année
affichée. Projection = Σ par appartement de (recettes ÷ mois clos × 12).

- **Plafond micro-BIC** : table par année dans `shared/` (77 700 € pour 2025, 83 600 € pour 2026 ; année inconnue =
  dernière connue). Jauge : recettes / plafond ; orange au-delà.
- **Seuil LMP** : 23 000 € de recettes (la condition « plus de 50 % des revenus professionnels » **n'est pas calculée** :
  la mention l'indique).
- Affichés à titre indicatif : à valider avec le comptable.

### R12 — Facture de gérance (saisie manuelle)

- Le **loyer arrive net des frais de gérance** : la banque ne montre qu'un virement net, sans le détail. Les frais figurent sur la
  **facture de gérance**, que l'utilisateur **saisit à la main** chaque mois (frais de gérance + frais supplémentaires) dans le
  dashboard (vue mois, carte de l'appartement géré). Modèle `ManagementInvoice` (`apartmentId`, `year`, `month`, `feesCents`, `extraFeesCents`).
- **Effet sur le tableau** : loyers bruts = loyer net reçu (transactions `APT_RENT_RECEIVED`) + frais de gérance + frais supplémentaires ;
  les deux lignes de frais viennent de la facture. Le **différentiel et le solde ne changent pas** (ils partent du net réellement encaissé) :
  la saisie n'a d'effet que sur la **répartition brut / frais** et sur les rendements.
- Facture non saisie sur un mois clos : frais = 0 (loyer brut = loyer net) et le mois est signalé (« Facture de gérance à saisir »).
- Un appartement sans gérant (`managerName` vide) n'a ni facture ni ligne de frais.
- Les frais de gérance ne sont **pas** des transactions : pas de catégorie `APT_MANAGEMENT_*`.

### R11 — Compte appartement, rattachement et apport

- **Nouveau type de compte `APARTMENT`** (enum `AccountType`, avec `PERSONAL` et `PROFESSIONAL`) : un relevé de compte
  appartement s'importe comme les autres (la banque n'est pas stockée : le format CSV se retrouve par l'empreinte de
  l'en-tête, `CsvFormat`). À l'import, on choisit **l'appartement** du relevé (`ImportBatch.apartmentId`) : toutes ses
  lignes y sont rattachées (`Transaction.apartmentId`, **obligatoire** pour un compte `APARTMENT`), modifiable ligne par
  ligne à la relecture (un seul compte peut porter plusieurs biens).
- Les transactions `APARTMENT` n'entrent **jamais** dans les enveloppes du budget perso : les dashboards perso filtrent déjà
  sur `accountType = PERSONAL`, aucun cas particulier à écrire.
- **Apport fonds perso** : un virement du perso vers le compte appartement existe **des deux côtés**. Côté appartement, c'est un
  crédit `APT_OWNER_CONTRIBUTION` (ligne « Apport fonds perso » du tableau). Côté perso, c'est un débit à catégoriser : nouvelle
  catégorie du compte `PERSONAL` **« Apport appartement »** (`APARTMENT_CONTRIBUTION`), rattachée à une enveloppe (H6). Pas de
  rapprochement automatique des deux lignes en V1.
- **Solde** : le solde de début d'année saisi est le **solde réel du compte appartement au 1ᵉʳ janvier** ; le solde fin de mois
  calculé doit coïncider avec le solde bancaire (contrôle visuel en V1, pas de contrôle automatique).
- Supprimer un appartement est **refusé** s'il porte des transactions (sinon : détacher d'abord).

## 4. Modèle de données

Une migration. Tout porte `userId`, toute requête filtre sur `ctx.session.user.id`.

| Modèle / champ               | Détail                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Apartment`                  | `userId`, `name`, `kind` (enum `ApartmentKind` : `FURNISHED` / `UNFURNISHED` / `SCI`, étiquette V1), `managerName?` (vide = en direct), `acquiredAt` (`@db.Date`, 1ᵉʳ du mois), `priceCents`, `rentCents`, `depositCents`, `managementFeeBps`, `creditInsuranceCents`, `propertyTaxCents` (annuel), `cfeCents` (annuel)                          |
| prêt (sur `Apartment`)       | `loanPrincipalCents`, `loanRateBps`, `loanTermMonths`, `loanFirstDueDate` (`@db.Date`), tous **optionnels** (un bien sans prêt est possible : alors pas de ligne Crédit)                                                                                                                                                                         |
| `ApartmentYearOpening`       | `apartmentId`, `year` (PK composée), `openingBalanceCents`                                                                                                                                                                                                                                                                                       |
| `ManagementInvoice`          | `apartmentId`, `year`, `month` (PK composée), `feesCents`, `extraFeesCents` : facture de gérance saisie à la main (R12)                                                                                                                                                                                                                          |
| `AccountType` (enum)         | + `APARTMENT` (compte appartement)                                                                                                                                                                                                                                                                                                               |
| `ImportBatch.apartmentId`    | FK nullable → `Apartment` (`onDelete: Restrict`) : appartement choisi à l'import, proposé par défaut à chaque ligne                                                                                                                                                                                                                              |
| `Transaction.apartmentId`    | FK nullable → `Apartment` (`onDelete: Restrict`) ; obligatoire pour `accountType = APARTMENT`, `@@index([userId, apartmentId, year, month])`                                                                                                                                                                                                     |
| `TransactionCategory` (enum) | + `APT_RENT_RECEIVED`, `APT_LOAN_REPAYMENT`, `APT_LOAN_INSURANCE`, `APT_HOME_INSURANCE`, `APT_CONDO_FEES`, `APT_PROPERTY_TAX`, `APT_CFE`, `APT_BANK_FEES`, `APT_REGULARIZATION`, `APT_OWNER_CONTRIBUTION`, `APT_OTHER` ; `ENERGY` et `INTERNET` sont réutilisées ; + `APARTMENT_CONTRIBUTION` (compte perso : apport vers le compte appartement) |

- `shared/account-categories.ts` : liste **`APARTMENT`** = les catégories `APT_*` + `ENERGY` + `INTERNET` ; liste `PERSONAL` + `APARTMENT_CONTRIBUTION`
  (`tsc` impose de ranger toute nouvelle catégorie et la liste du nouveau type). Libellés dans `fr/enums.ts`, libellé du type de compte « Appartement » inclus.
- Aucun libellé dans `shared/` (même règle que `personal-rules.ts`) : les textes vont dans `fr/apartments.ts`.
- `ApartmentKind` : libellés dans `fr/enums.ts` (`as const satisfies Record<ApartmentKind, string>`).

## 5. Règles dans `shared/`

```
shared/apartment-rules.ts   # catégorie → ligne du tableau (R2), plafonds micro-BIC par année, seuil LMP, tolérance de rapprochement (100 centimes), mois TF (octobre) / CFE (décembre)
shared/apartment-loan.ts    # loanSchedule (R6) + matchLoanPayment (R7) : purs, sans dépendance
```

## 6. Architecture

```
server/lib/apartments/
  load-period.ts       # requêtes Prisma : appartements actifs, transactions rattachées validées, soldes d'ouverture
  compute-month.ts     # PUR : un appartement + un mois → { forecast, actual | null } (lignes R2, différentiel, effort, solde)
  compute-period.ts    # PUR : agrège n mois (vue année) sur les mêmes mois clos
  loan.ts              # ventilation capital / intérêts d'une transaction de prêt (R7), capital remboursé cumulé
  thresholds.ts        # PUR : recettes, projection, jauges micro-BIC / LMP (R10)
server/trpc/routers/apartment.ts       # CRUD appartements + soldes d'ouverture (Réglages)
server/trpc/routers/apartments.ts      # lecture dashboard : month / year / periods  (nom proche, rôle distinct : à nommer `apartmentDashboard` si ambigu)
```

La **vue année = n × `computeMonth`** (aucune logique dupliquée), comme le dashboard Pro.

```
src/features/apartments/
  components/  apartments-dashboard · apartment-card · apartment-table · loan-gauge · apartment-kpis (rent + effort) · lmnp-thresholds · apartment-transactions
  hooks/       use-apartments-dashboard.ts
src/features/settings/components/ apartments-settings-form.tsx   # onglet « Appartements » + bloc Prêt (synthèse via shared/apartment-loan)
src/features/review/              # colonne Appartement + mention « échéance reconnue »
src/pages/apartments-page.tsx     # + <Route path="/apartments"> + entrée MAIN_NAV
src/lib/i18n/fr/apartments.ts
```

- Réutiliser `PeriodPicker` / `usePeriodSelection`, `KpiCard`, `InfoTip`, `TargetGauge` et `TransactionsTable` partagés
  (ajouter une colonne « Appartement » au tableau si nécessaire, sans le dupliquer).
- Le lien « Réglages » d'une carte pointe vers `/settings?tab=apt` (le composant Réglages lit `tab` dans l'URL).
- Graphiques / jauges en **CSS** (aucune dépendance), état des formulaires en `useState` / `useReducer`.

## 7. Découpage en PR (empilées, chacune relisible en quelques minutes)

| #   | Branche                   | Contenu                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `feat/apartment-model`    | Migration : `AccountType.APARTMENT`, `Apartment`, `ApartmentYearOpening`, `ImportBatch.apartmentId`, `Transaction.apartmentId`, enum `ApartmentKind`, catégories `APT_*` + `account-categories` + `fr/enums.ts` + seed de 2 appartements fictifs                                                                                                    |
| 2   | `feat/apartment-rules`    | `shared/apartment-rules.ts` + `shared/apartment-loan.ts` (R6, R7), vérifiés sur le seed (Vitest a été retiré, #57)                                                                                                                                                                                                                                  |
| 3   | `feat/apartment-settings` | Routes `apartment.*` + onglet « Appartements » des Réglages (incl. bloc Prêt, champ % de gérance, soldes de début d'année) ; `?tab=` lu dans l'URL                                                                                                                                                                                                  |
| 4   | `feat/import-apartment`   | Import : type de compte « Appartement » + choix de l'appartement ; relecture : colonne Appartement (visible pour ce type de compte), `transaction.setApartment`, catégories `APT_*` proposées, catégorie perso « Apport appartement », mention « échéance reconnue / non reconnue » (R7) ; libellés du type de compte dans l'historique des imports |
| 5   | `feat/apartment-compute`  | `server/lib/apartments/` (R2 à R5, R9, R10) + routes de lecture `month` / `year` ; route `apartment.setManagementInvoice` (R12)                                                                                                                                                                                                                     |
| 6   | `feat/apartments-month`   | Page `/apartments`, entrée de menu, en-tête, pastilles, 2 KPI + jauges, cartes + tableau, tableau des transactions rattachées, i18n ; formulaire « Facture de gérance » (R12)                                                                                                                                                                       |
| 7   | `feat/apartments-year`    | Vue année : colonnes année, rendements brut / net, seuils LMNP (R10)                                                                                                                                                                                                                                                                                |
| 8   | `chore/apartments-docs`   | `docs/fonctionnel.md` (section Appartements), `CLAUDE.md` (roadmap + décisions), cette page passée en « réalisé »                                                                                                                                                                                                                                   |

## 8. Hypothèses à confirmer (par défaut retenu)

| #   | Question                                                             | Défaut retenu                                                                                                   |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| H1  | Qu'est-ce qu'un « mois clos » ?                                      | Un mois antérieur au mois en cours                                                                              |
| H2  | Prévu des charges mensuelles sans saisie ?                           | Réel du même mois N-1, sinon moyenne des mois clos, sinon 0                                                     |
| H3  | Le prêt est-il à taux fixe, sans palier ni différé ?                 | Oui (sinon : saisie du tableau d'amortissement de la banque, plus tard)                                         |
| H4  | L'assurance emprunteur est-elle prélevée avec l'échéance ou à part ? | À part (une ligne `APT_LOAN_INSURANCE`, comme l'Excel)                                                          |
| H5  | Le rendement se calcule-t-il sur le prix seul ou sur prix + frais ?  | Prix seul                                                                                                       |
| H6  | Apport appartement côté perso : quelle enveloppe ?                   | `LONG_TERM_SAVINGS` (patrimoine immobilier) ; alternative : dépenses courantes                                  |
| H7  | Compte bancaire dédié aux appartements ?                             | **Tranché** : oui, compte dédié, relevé importé à part (type `APARTMENT`), un compte pour un ou plusieurs biens |
| H8  | Le loyer arrive-t-il brut ou net de frais de gérance ?               | **Tranché** : net ; les frais viennent de la facture, saisie à la main chaque mois (R12)                        |

H7 (compte dédié) et H8 (loyer net, facture saisie) sont tranchés.

## 9. Pièges de la maquette (ne pas copier)

La maquette est un **canvas de données fictives** : seuls le **solde de début d'année 537,43 €** et la **mensualité
1 148,83 €** sont réels. Ne pas reproduire :

- les intérêts qui baissent de 1,30 € par mois, la saisonnalité de l'électricité, les anomalies codées en dur
  (loyer à 760 € un mois, vacance de Lyon en juillet 2026, régularisation de 46,20 €) et l'apport de 650 € / 180 € par mois ;
- le calcul du capital par `mensualité − intérêts` avec un `int0` saisi : le vrai calcul vient de `loanSchedule` ;
- les champs retirés des Réglages (régime fiscal, terrain, frais, mobilier).
