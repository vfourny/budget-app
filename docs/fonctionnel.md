# Règles fonctionnelles

Ce document décrit **ce que fait l'app** et les règles métier à respecter. Les détails d'implémentation sont
dans [technique.md](./technique.md).

## Principe : la méthode des enveloppes

Chaque dépense est rattachée à une **catégorie**, chaque catégorie à une **enveloppe**. Le budget se pilote par
enveloppe : on compare, pour un mois, l'enveloppe **recommandée** au **réel** dépensé.

### Enveloppes

Définies dans l'enum Prisma `Envelope` et les libellés dans `src/lib/i18n/fr/enums.ts` (`envelopes` : l'ordre des clés =
ordre d'affichage). Les libellés sont préfixés « Enveloppe » pour ne pas les confondre avec une catégorie du même nom (
Loisirs, Formation).

| Enveloppe                    | Code                |
| ---------------------------- | ------------------- |
| Enveloppe dépenses courantes | `CURRENT_EXPENSES`  |
| Enveloppe loisirs            | `LEISURE`           |
| Enveloppe formation          | `TRAINING`          |
| Enveloppe épargne sécurité   | `SAFETY_SAVINGS`    |
| Enveloppe épargne long terme | `LONG_TERM_SAVINGS` |

### Catégories de transaction

Liste **figée** (enum Prisma `TransactionCategory`), reprise des colonnes de l'ancien Google Sheet. Libellé affiché :
`src/lib/i18n/fr/enums.ts` ; enveloppe de rattachement : `shared/personal/rules.ts`.

| Catégorie           | Code                     | Enveloppe          |
| ------------------- | ------------------------ | ------------------ |
| Loyer versé         | `RENT_PAID`              | Dépenses courantes |
| Essence             | `FUEL`                   | Dépenses courantes |
| Banque et assurance | `BANK_INSURANCE`         | Dépenses courantes |
| Restaurant          | `RESTAURANT`             | Loisirs            |
| Alimentaire         | `GROCERIES`              | Dépenses courantes |
| Soirée              | `NIGHTLIFE`              | Loisirs            |
| Loisirs             | `LEISURE`                | Loisirs            |
| Formation           | `TRAINING`               | Formation          |
| Vêtements & Soins   | `CLOTHING_CARE`          | Loisirs            |
| Santé               | `HEALTH`                 | Dépenses courantes |
| Transport           | `TRANSPORT`              | Dépenses courantes |
| Impôt et Taxes      | `TAXES`                  | Dépenses courantes |
| Abonnements divers  | `OTHER_SUBSCRIPTIONS`    | Loisirs            |
| Énergie             | `ENERGY`                 | Dépenses courantes |
| Télécom             | `TELECOM`                | Dépenses courantes |
| Internet            | `INTERNET`               | Dépenses courantes |
| Autres              | `OTHER`                  | Dépenses courantes |
| Épargne court terme | `SHORT_TERM_SAVINGS`     | Épargne sécurité   |
| Épargne long terme  | `LONG_TERM_SAVINGS`      | Épargne long terme |
| Versement salaire   | `SALARY_PAYMENT`         | — (revenu)         |
| Versement BNC       | `BNC_PAYMENT`            | — (revenu)         |
| Versement vacation  | `VACATION_PAYMENT`       | — (revenu)         |
| Autre remboursement | `REFUND`                 | — (crédit)         |
| Remboursement pro   | `PROFESSIONAL_REFUND`    | — (crédit)         |
| Apport appartement  | `APARTMENT_CONTRIBUTION` | Épargne long terme |

Points d'attention :

- **Toutes les règles modifiables** sont dans `shared/personal/rules.ts` : catégories cumulées dans chaque enveloppe (
  `ENVELOPE_CATEGORIES`), enveloppes d'épargne, catégories affichées dans la card « Par catégorie » (
  `CATEGORY_CARD_CATEGORIES`), lignes de la card Revenus (`REVENUE_LINES`). Une règle modifiée s'applique à tout l'
  historique (rien n'est stocké en base). La colonne « Enveloppe » du tableau ci-dessus est indicative : la source de
  vérité est ce fichier.
- La catégorie d'une transaction est **optionnelle** (`null` tant qu'elle n'est pas catégorisée / relue).
- Ajouter ou renommer une catégorie = modifier l'enum Prisma **+ une migration
  versionnée + `src/lib/i18n/fr/enums.ts` + `server/lib/categorize/category-hints.ts`**, puis la ranger dans
  `shared/personal/rules.ts` (le typage `Record<TransactionCategory, …>` fait échouer `tsc` si l'un des deux est oublié).

## Type de compte

Chaque import et chaque transaction porte un **type** : `PERSONAL`, `PROFESSIONAL` (Stygma) ou `APARTMENT` (compte dédié aux appartements). C'est la seule notion
de « compte » de l'app : il n'y a pas de table de comptes bancaires. La banque n'est pas stockée non plus : le
format des colonnes du CSV est retrouvé par l'empreinte de l'en-tête du fichier (`CsvFormat`, voir
[import-csv.md](./import-csv.md)). Le type de compte ne détermine que les catégories proposées.

Un relevé `APARTMENT` est rattaché à un appartement à l'import (`ImportBatch.apartmentId`), modifiable ligne par ligne à
la relecture (`Transaction.apartmentId`, obligatoire pour ce type de compte). Ses transactions n'entrent jamais dans les
enveloppes du budget perso (les dashboards perso filtrent sur `PERSONAL`).

## Transactions

- **Montant** : entier en **centimes**, **signé** — négatif = débit, positif = crédit. Jamais de float.
- **Date** : la date d'opération (sans heure).
- **Mois / année** : dénormalisés depuis la date (`month` 1-12, `year`) pour les agrégations rapides.
- **Libellé** : texte brut de la banque (ou libellé enrichi, voir import), sert de contexte à la catégorisation
  automatique.

## Cycle de vie d'un import

```
Upload CSV → parsing → ImportBatch (PENDING_REVIEW) → catégorisation Gemini
          → relecture / correction inline → « Valider » → ImportBatch (VALIDATED)
```

1. **Upload** : l'utilisateur choisit le type de compte (perso / pro / appartement, + l'appartement) et dépose le CSV de la banque.
2. **Parsing** (route `import.create`) : le format retrouvé par l'empreinte de l'en-tête (détecté par l'IA s'il est inconnu) transforme les lignes en
   transactions normalisées. Une ligne illisible est **écartée et signalée** (numéro de ligne + contenu brut) sans
   bloquer les autres. Les lignes **déjà importées** (relevés qui se chevauchent) sont écartées aussi,
   voir [import-csv.md](./import-csv.md).
3. **Catégorisation** (route `categorize.run`) : l'API Gemini (Flash-Lite, palier gratuit) propose une catégorie (valeur
   de l'enum) avec un score de `confidence` (0 à 1, stocké dans `Transaction.categoryConfidence`), en s'appuyant sur des
   exemples de transactions déjà validées du même type de compte (few-shot, vide au tout premier import). Sous **0,7**
   de confiance, la ligne ira dans « À vérifier ». Relançable : seules les lignes encore sans catégorie sont traitées ;
   si l'appel à l'IA échoue, rien n'est écrit.
4. **Relecture** (`/imports/:id`) : la catégorisation part automatiquement juste après l'import, puis on arrive sur le
   tableau. Les lignes « à vérifier » (sans catégorie ou confiance < 0,7) sont surlignées ; chaque ligne a un sélecteur
   de catégorie (un choix manuel = « Confirmée »). Filtre Toutes / À vérifier.
5. **Validation** : statut `VALIDATED` + `validatedAt`. Les transactions sont écrites en base **dès l'import** (sans
   catégorie, rattachées à l'`ImportBatch`) pour que la relecture survive à un rechargement de page ; **seuls les
   imports `VALIDATED` comptent dans les dashboards**. « Valider » reste désactivé tant qu'une ligne est sans catégorie
   ou à faible confiance ; après validation on revient à l'historique, où un import (validé ou non) peut être supprimé
   avec ses lignes. « Catégoriser avec l'IA » relance `categorize.run` si l'appel a échoué à l'import.

Règles :

- Supprimer un `ImportBatch` **supprime ses transactions** (cascade).
- Une transaction peut ne pas avoir d'`ImportBatch` (`importBatchId` nullable, ex. saisie manuelle future).
- Les corrections validées alimentent les exemples few-shot des imports suivants : plus l'historique grandit, plus la
  catégorisation est juste.

## Dashboard Perso (`/personal`)

Ne compte que les transactions des imports **VALIDATED** du compte perso. Hypothèses V1 : tout crédit est un **revenu
** ; un débit en catégorie « Épargne court terme » ou « Épargne long terme » est de l'**épargne** (pas une dépense) ; le
reste des débits sont des **dépenses**.

- **Vue mois** : sélecteur de mois (et flèches) limité aux mois qui ont des données ; cartes Dépenses (avec, par
  enveloppe, une jauge **réel vs recommandé** : barre verte si on reste sous la part recommandée du revenu, ambre
  au-delà ; l'inverse pour l'épargne), Revenus (détail : Salaire = `SALARY_PAYMENT` + `BNC_PAYMENT`, Vacations,
  Remboursement pro, Autre remboursement, + « Autres » s'il reste des crédits non rangés), Épargne du mois (+ % des
  revenus) ; tableau des transactions triable ; dépenses par catégorie (toutes les catégories de la liste, même à 0 €).
- **Bandeau Solde du compte** (en haut, mois et année) : solde en **début** et **fin** de période + variation, pour
  comparer au relevé bancaire. Début de période = fin du mois précédent (vue année : fin décembre N-1 → fin décembre N).
  Les soldes se calculent depuis le dernier **solde saisi** (badge « saisi », sinon « calculé ») : solde saisi + transactions
  validées des mois suivants. Sans saisie antérieure : « Non renseigné ». Le crayon saisit le solde réel de ce mois
  (`AccountBalance`) ; pour démarrer en mars, on saisit le solde de fin février depuis le « Début de mois » de mars. Si un
  solde saisi ne correspond pas au calcul depuis la saisie précédente, l'**écart** s'affiche (import manquant ou en double).
- **Ordre des cartes** (mois et année) : Revenus, Dépenses, Épargne.
- **Vue année** : mêmes totaux sur l'année choisie, sur deux lignes (3 + 2) : plus la dépense moyenne par mois (mois ayant des données) et l'**IR estimé** (barème progressif 1 part de l'année affichée, appliqué au revenu annualisé = cumul / mois avec données × 12, sans abattement ni réductions). Le barème est une donnée du code (`shared/fiscal/income-tax.ts`, `INCOME_TAX_BRACKETS_BY_YEAR`, 2025 et 2026 pour l'instant), pas une saisie : **chaque nouvelle année s'ajoute par une PR**. Si l'année affichée n'a pas de barème, la card affiche « Barème de l'IR <année> non renseigné ».

- Les parts recommandées (méthode des 5 comptes) se règlent dans **Réglages** (le total doit faire exactement 100 %).
  Les 5 enveloppes sont toujours affichées avec leur jauge, même à 0 €.
- **Card Charges fixes** (bandeau entre les cartes KPI et le tableau) : débits de la période pour Loyer, Énergie, Télécom
  et Internet (`FIXED_CHARGES_CATEGORIES` dans `shared/personal/rules.ts`), toujours affichés même à 0 €, + leur total ; mensuel en vue mois,
  cumulé en vue année.
- **À venir** : donut par catégorie en vue année.

### Tableau des transactions (Perso et Pro)

Composant partagé : résumé (nombre, crédits, débits), filtres Toutes / Crédits / Débits / À vérifier, tri par colonne.
« À vérifier » = sans catégorie ou « Autres » / « Autres charges pro » (`TO_CHECK_CATEGORIES`).

- Mockup de référence : canvas Claude Design « Budget — maquette MVP ».

## Catégories du compte pro

Un relevé **pro** ne propose (relecture) et ne demande à Gemini que les catégories pro ; un relevé perso, toutes les
autres (`ACCOUNT_CATEGORIES.PROFESSIONAL` dans `shared/transactions/categories.ts`, refus `CATEGORY_NOT_ALLOWED` sinon).

| Groupe        | Catégories                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encaissements | Encaissement client `CLIENT_PAYMENT`, Autre crédit pro `PROFESSIONAL_OTHER_CREDIT`                                                                                                          |
| Charges pro   | RC Pro & assurances, Comptable, Frais bancaires, Petit matériel, Logiciels & abonnements, Restauration, Voyages et déplacements, Impôts et taxes pro, Autres charges pro (`PROFESSIONAL_*`) |
| Rémunération  | Salaire net versé `NET_SALARY_TRANSFER`, Revenus BNC prélevés `BNC_WITHDRAWAL`, Remboursement frais mixtes `MIXED_COSTS_REFUND`                                                             |
| Cotisations   | URSSAF, Retraite complémentaire, Complémentaire santé, Prévoyance, Prélèvement à la source                                                                                                  |
| Fiscalité     | TVA `VAT_PAYMENT`                                                                                                                                                                           |

Taux de TVA déductible par charge, frais mixtes et répartition des cotisations : `shared/professional/rules.ts` (l'équivalent
pro de `shared/personal/rules.ts`).

## Dashboard Pro Stygma (`/professional`)

Prévisionnel et réel côte à côte, mois par mois. Un mois **a un réel** s'il est commencé ou passé ; au-delà, seul le
prévisionnel s'affiche (bandeau « Mois à venir »). Ne comptent que les transactions des imports **VALIDATED**.

### Règles de l'année (Réglages › Pro)

Un jeu de règles **par année** (`ProfessionalYearSettings`) : régime (seule la **SAS à l'IR** est calculée ; IS et EURL
« Bientôt »), taux patronal, salarial, net
imposable, PAS, charges sociales sur la quote-part de bénéfice, surfaces bureau / logement, barème km (la clé des autres frais
mixtes est fixe : 5/7, `MIXED_COSTS_RATIO`). Une année non configurée reprend la dernière année configurée avant elle, sinon les valeurs par
défaut (`DEFAULT_PROFESSIONAL_YEAR_SETTINGS`).

### Règles de calcul (SAS à l'IR)

- **CA HT** = jours × TJM des lignes de facturation, saisies en **prévu** et en **réel** (à la main : jours et TJM ne
  sont pas sur le relevé), rattaché au mois de la prestation.
- **Clients** : nom en texte libre dans la ligne de facturation (suggestions des clients déjà saisis, choisir un
  client reprend son dernier TJM). Pas de liste à gérer dans Réglages.
- **Encaissé** = total des crédits « Encaissement client » (`CLIENT_PAYMENT`) du mois, TTC.
- **Reste à encaisser** = solde **cumulé** : ce qui restait dû + facturé TTC du mois (réel) − encaissé du mois,
  jamais négatif. Les clients payant plus tard, le solde se reporte d'un mois sur l'autre (et d'une année sur
  l'autre). Les virements reçus jusqu'au premier mois facturé dans l'app paient des factures antérieures : affichés
  en « Encaissé », ils ne diminuent pas le solde.
- **Charges pro** : débits TTC du relevé ramenés en HT au taux de leur catégorie ; la différence est la **TVA
  déductible**. Frais mixtes : remboursements versés (pas de TVA déductible).
- **TVA à reverser** = 20 % du CA HT − TVA déductible, par mois. La TVA payée un mois (catégorie TVA) est comparée à
  la TVA due du mois précédent.
- **Salaire et cotisations** : brut du mois (éditeur du prévisionnel), cotisations et PAS = brut × taux de l'année. Les prélèvements URSSAF,
  retraite, santé, prévoyance et PAS sont catégorisés mais **n'entrent pas dans les charges** (pas de double
  comptage) ; le détail « dont URSSAF… » utilise une répartition indicative.
- **Bénéfice** = CA HT − charges pro − salaires bruts − cotisations patronales. **Reste en trésorerie** = bénéfice −
  BNC prélevés. **Charges sociales sur bénéfice** = taux × max(0, bénéfice), réglées en perso.
- **Frais mixtes** : dû = dépense **perso** du mois (Loyer, Internet, Télécom, Énergie) × quote-part (loyer : surface
  bureau / logement ; autres : ratio fixe 5/7). Les remboursements reçus sont répartis dans l'ordre loyer → internet →
  téléphone → énergie.
- **Frais km** : km réels = somme des trajets du journal ; montant = km × barème de l'année.

### Prévisionnel (« Éditer le prévisionnel »)

Cinq onglets : Facturation (prévu / réel, une ligne par client), Charges & BNC (charges HT + BNC prévu), Salaire
(brut du mois, `SalaryForecast` ; le réel = le prévu, le relevé ne montrant que le net), Frais mixtes (dépenses perso
prévues), Frais km. **Sans saisie, un montant prévu vaut le réel du même mois l'année précédente** (charges, BNC,
frais mixtes, km ; pour le salaire, le brut du même mois N-1). « Appliquer aux mois suivants » recopie les valeurs du mois sur la fin
de l'année.

### Écran

- **Vue mois** : CA HT (facturé, encaissé, reste à encaisser, jours), TVA à reverser, Bénéfice (équation, répartition
  du CA, BNC, reste en trésorerie, charges sociales), Facturation & encaissements, Prévisionnel vs réel par catégorie,
  Frais mixtes, Frais km (+ journal des trajets), Transactions du mois (même tableau que le Perso).
- **Vue année** : CA HT final (réel + prévu restant), bénéfice final, TVA réelle cumulée, frais km ; histogramme du CA ;
  compte de résultat simplifié (12 mois + Final) ; catégories, frais mixtes et km cumulés.
- Mockup de référence : artboard « Dashboard pro — Stygma SAS » du canvas Claude Design.

## Appartements (`/apartments`)

Suivi de **trésorerie** des biens en location (comme l'onglet « Toulouse » de l'ancien tableur), sans fiscalité ni
rappels (déclaration = comptable). Les règles ci-dessous (R1 à R12, hypothèses H1 à H6) sont citées dans le code
(`server/lib/apartments/`, `shared/apartments/`, seuils LMNP dans `shared/fiscal/lmnp.ts`).

- **Réglages › Appartements** (`/settings?tab=apt`) : par bien, régime (étiquette), gérance (interrupteur, désactivé = en direct), mois
  d'acquisition, prix, assurance emprunteur, solde du compte au 1er janvier, prêt à taux fixe (synthèse :
  mensualité, 1ʳᵉ échéance, intérêts totaux).
- **Import** : type de compte « Appartement » + choix de l'appartement. Les catégories `APT_*` sont proposées ; le
  virement d'apport vers ce compte se catégorise « Apport appartement » côté perso (enveloppe épargne long terme).
  À la relecture, une échéance de prêt est reconnue si elle est à ±1 € de la mensualité du tableau d'amortissement.
- **Vue mois** (mois clos seulement) : pour chaque appartement actif (à partir du mois d'acquisition), tableau
  Prévisionnel / Réalisé / Écart (solde, loyers, crédit, charges), jauge du capital remboursé, facture de gérance
  manquante signalée (badge), 2 KPI (loyers nets perçus, effort d'épargne nécessaire) et les
  transactions rattachées.
- **Vue année** : mêmes colonnes sur les mois clos, rendements brut / net sur le prix d'achat, et
  seuils LMNP (plafond micro-BIC, seuil LMP) indicatifs.
- **Éditeur du prévisionnel** (bouton de la carte) : loyer brut et charges saisis mois par mois ; pour un bien géré,
  section **Gérance** : taux de gérance prévu (% du loyer brut, vaut pour tous les mois) et facture de gérance du mois
  (réel, mois clos seulement, R12). L'échéance du prêt et l'assurance emprunteur des Réglages ne se saisissent pas. Sans saisie : le loyer, la taxe foncière
  (octobre) et la CFE (décembre) reprennent leur dernière valeur saisie, sinon 0 ; les charges mensuelles reprennent
  le réel du même mois N-1, sinon la moyenne des autres mois clos, sinon 0 ; régularisation et autres valent 0.
- **Solde** : solde fin de mois = début + différentiel + apport ; il doit coïncider avec le solde bancaire. L'effort
  d'épargne annuel est la somme des efforts mensuels.

### Règles

- **R1 — Période** : un appartement est actif à partir de son mois d'acquisition (inclus). Un mois est **clos** s'il est
  antérieur au mois en cours (H1) ; la vue ne propose que les mois clos.
- **R2 — Lignes du tableau** : le réalisé = transactions **validées** rattachées (`Transaction.apartmentId`), par
  catégorie : loyers `APT_RENT_RECEIVED` (+ frais de la facture, R12), crédit (ventilé, R6/R7) + `APT_LOAN_INSURANCE`,
  charges fixes `ENERGY` / `APT_HOME_INSURANCE` / `INTERNET` / `APT_CONDO_FEES`, charges annuelles `APT_PROPERTY_TAX` /
  `APT_CFE`, autres `APT_BANK_FEES` / `APT_REGULARIZATION` / `APT_OTHER`, apport `APT_OWNER_CONTRIBUTION`. Une ligne de
  charge = −(somme des montants signés) : une régularisation créditée vient en diminution. Charges annuelles affichées en
  vue mois seulement si le mois en contient ; montant nul = « — ».
- **R3 — Prévisionnel** : loyer brut saisi par mois (sans saisie : dernière saisie antérieure, sinon 0) ; gérance =
  loyer × taux saisi dans l'éditeur ; échéance du tableau d'amortissement ; assurance des Réglages. Taxe foncière en **octobre** et CFE en
  **décembre** (sans saisie : dernier montant saisi, sinon 0 ; le réel compte dans le mois de paiement, sans lissage).
  Les charges mensuelles saisies reprennent le réel du même mois N-1, sinon la moyenne des autres mois clos, sinon 0
  (H2) ; régularisation et autres valent 0 sans saisie. Pas de vacance prévue.
- **R4 — Réalisé** : import `VALIDATED`, `apartmentId` renseigné, mois de la période. Sans catégorie = « Autres », signalé
  « À vérifier ».
- **R5 — Solde et effort** : différentiel = loyer net reçu − crédit (capital + intérêts + assurance) − charges ;
  effort d'épargne = max(0, −différentiel) ; solde fin de mois = début + différentiel + apport. Solde de début d'année
  saisi (`ApartmentYearOpening`, 0 à défaut). En vue année, prévu et réalisé portent sur les mêmes mois clos et
  **l'effort annuel = somme des efforts mensuels**. Écart = réalisé − prévu (négatif = défavorable).
- **R6 — Prêt** : taux fixe sans palier ni différé (H3), `loanSchedule` dans `shared/apartments/loan.ts` (mensualité
  arrondie, intérêts = capital restant × taux mensuel, la dernière échéance solde le capital). L'assurance emprunteur
  est à part (H4). Jauge « capital remboursé » = capitaux du tableau jusqu'à la fin de la période, plafonnée au dernier
  mois clos.
- **R7 — Rapprochement** : une transaction `APT_LOAN_REPAYMENT` est reconnue si elle est à ±1 € de la mensualité (ou de
  mensualité + assurance) ; sinon elle est signalée à la relecture (« attendu X € »). Intérêts = ceux du tableau,
  capital = montant − intérêts − assurance (le solde reste égal au solde bancaire). Rien n'est stocké : recalculé à la
  lecture.
- **R8 — KPI** : **loyers nets perçus** (jauge vs loyers dus = somme des loyers bruts prévus des mois clos actifs) ; **effort d'épargne
  nécessaire** = Σ des efforts (jauge : apport réel vs effort).
- **R9 — Rendements** (vue année) : brut = loyers perçus annualisés ÷ prix d'achat ; net = (loyers − charges hors
  crédit) annualisés ÷ prix d'achat. Prix d'achat seul, sans frais (H5).
- **R10 — Seuils LMNP** (vue année, indicatifs) : recettes des biens LMNP de janvier au dernier mois clos + projection
  annuelle ; plafond micro-BIC par année dans `shared/fiscal/lmnp.ts` (année inconnue = dernière connue) ; seuil LMP
  23 000 € (la condition des 50 % des revenus n'est pas calculée).
- **R11 — Compte et apport** : type de compte `APARTMENT` ; l'appartement choisi à l'import (`ImportBatch.apartmentId`)
  est modifiable ligne par ligne (`Transaction.apartmentId`, obligatoire pour ce type). Ces transactions n'entrent jamais
  dans le budget perso. Un apport existe des deux côtés : crédit `APT_OWNER_CONTRIBUTION` côté appartement, débit
  « Apport appartement » (`APARTMENT_CONTRIBUTION`, enveloppe épargne long terme, H6) côté perso, sans rapprochement
  automatique. Un appartement qui porte des transactions ou des relevés ne se supprime pas.
- **R12 — Facture de gérance** : le loyer arrive **net** ; frais de gérance et frais supplémentaires sont saisis à la main
  chaque mois clos dans l'éditeur du prévisionnel (`ManagementInvoice`). Loyer brut = net reçu + frais ; le différentiel et le solde ne changent
  pas. Facture non saisie sur un mois clos = frais à 0, mois signalé. Bien en direct : ni facture ni frais.
