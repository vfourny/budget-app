# Plan d'action — Dashboard Pro (Stygma SAS)

> Rédigé le 2026-10-05 à partir de la maquette (canvas Claude Design « Budget — maquette MVP », artboards
> **Pro** et **Réglages**), de `CLAUDE.md`, `docs/` et du code de `main` (023ccda).
> Objectif : livrer l'écran `/professional` en **PR courtes empilées**, en réutilisant au maximum l'existant.

## État (2026-10-06)

**Réalisé** en 22 PR empilées, dans l'ordre du § 5. Les questions du § 7 ont été tranchées avec l'hypothèse par défaut
(toutes reportées dans les PR et dans `CLAUDE.md` › Décisions) :

1. Catégories pro du § 3, avec « Logiciels & abonnements » (TVA déductible 0 % : services facturés depuis l'étranger).
2. Cotisations calculées depuis Réglages ; les prélèvements URSSAF / retraite / santé / prévoyance / PAS sont catégorisés mais hors charges.
3. Prévu des charges sans saisie = réel HT du même mois N-1 (même règle que frais mixtes et km).
4. Table `Client` (nom, mot-clé bancaire, TJM par défaut), gérée dans Réglages › Pro.
5. « À vérifier » = sans catégorie ou « Autres » / « Autres charges pro ».
6. Vitest ajouté pour `server/lib/pro/` (`pnpm test`, en CI).
7. Années du régime : années configurées + année précédente, en cours et suivante.

Écarts assumés avec la maquette : enregistrement explicite dans l'éditeur (bouton) au lieu d'un enregistrement à chaque
frappe ; un virement client ne paie que les factures des mois **antérieurs** ; le tableau des catégories de la vue année
compare prévu et réel sur les mois avec réel (prévu de l'année en sous-titre).

---

## 1. Ce que montre la maquette

### Vue mois

| Bloc                                     | Contenu                                                                                                                                                                                                        | Source des données                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| En-tête                                  | « Vue du mois · Stygma SAS », titre mois + année, boutons **Éditer le prévisionnel**, **Transactions (N)** (ancre), **Importer un relevé pro**, Mois / Année, flèches                                          | —                                                                         |
| Bandeau « Mois à venir »                 | Affiché quand le mois n'a que du prévisionnel                                                                                                                                                                  | date du jour                                                              |
| KPI **CA HT**                            | Réel (ou prévu), jauge réel vs prévu, écart ; stats : Facturé HT · Encaissé TTC · Reste à encaisser TTC · Jours facturés                                                                                       | lignes de facturation (jours × TJM) + encaissements du relevé             |
| **TVA à reverser**                       | Collectée (20 % du CA) − déductible (taux par catégorie de charge) = à reverser, réel vs prévu                                                                                                                 | calcul                                                                    |
| **Bénéfice**                             | Équation CA HT − charges pro − salaires bruts − cotisations patronales = bénéfice ; barre empilée de répartition du CA ; puis − BNC prélevés = reste en trésorerie ; charges sociales sur bénéfice             | calcul + Réglages › Pro                                                   |
| **Facturation & encaissements**          | Une ligne par client : statut (Encaissée / En attente / Non facturé / À facturer), TTC, jours × TJM réel vs prévu, jauge HT ; bouton « Saisir jours & TJM réels »                                              | lignes de facturation + rapprochement avec les crédits du relevé pro      |
| **Prévisionnel vs réel · par catégorie** | Tableau Prévu / Réel / Écart en 3 groupes : Charges pro (+ total), Rémunération & cotisations (dont URSSAF, retraite, santé, prévoyance, cotisations salariales, PAS, charges sociales), Fiscalité (TVA payée) | prévisionnel saisi + transactions pro + Réglages                          |
| **Frais mixtes perso → pro**             | Loyer (prorata surface), Internet / Téléphone / Électricité (clé 5/7) : payé / dû, statut Soldé / Partiel / À rembourser / Prévu, reste à rembourser                                                           | dépenses **perso** (RENT, INTERNET, TELECOM, ENERGY) + remboursements pro |
| **Frais kilométriques**                  | Km réalisés vs prévus, montant à déclarer (km × barème), cumul, **journal des trajets** (+ Ajouter un trajet)                                                                                                  | trajets saisis + prévisionnel km                                          |
| **Transactions du mois**                 | Même tableau que Perso (filtres, tri, résumé)                                                                                                                                                                  | transactions pro validées                                                 |
| Modale **Éditer le prévisionnel**        | 4 onglets : Facturation (Prévu / Réel, une ligne par client), Charges & rémunération (+ BNC prévu), Frais mixtes (pré-rempli N-1), Frais km (pré-rempli N-1) ; « Appliquer aux mois suivants »                 | écriture                                                                  |

### Vue année

KPI (CA HT final = réel + prévu restant, Bénéfice final, TVA à reverser cumulée, Frais km à déclarer) ·
histogramme CA HT réel / prévu par mois (+ charges) · **Compte de résultat simplifié** (12 mois + « Final »,
mois à venir en italique) · Catégories prévu vs réel sur l'année (avec jauge) · Frais mixtes année · Frais km année.

### Réglages (artboard modifié)

Deux onglets **Perso** / **Pro · Stygma** :

- **Perso** = l'existant (parts par enveloppe + barème IR), simplement déplacé dans l'onglet.
- **Pro · Stygma** = « Régime de Stygma », **un jeu de règles par année** (2025 → 2028, pastille « configuré ») ;
  une année non configurée reprend la dernière année configurée avant elle (« valeurs reprises de 2025 »).
  Régime : **SAS à l'IR** (actif), SAS à l'IS / EURL (désactivés « Bientôt ») ; option IR : première année
  (+ « Exercice n sur 5 ») ; cotisations sur salaire (brut mensuel, % patronal, % salarial, % net imposable,
  % PAS) ; quote-part de bénéfice (% charges sociales) ; frais mixtes et déplacements (surface bureau,
  surface logement, clé n/d, barème km €/km).

---

## 2. Ce qu'on réutilise

| Existant                                                                             | Réutilisation pour le Pro                                                                                                    |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Import CSV + parseur **Banque Populaire** (`server/lib/csv/banks`)                   | Tel quel : `accountType = PROFESSIONAL` existe déjà                                                                          |
| Relecture, `transaction.setCategory`, `import.validate/delete`                       | Tel quel, avec la **liste de catégories filtrée par type de compte**                                                         |
| Catégorisation Gemini (few-shot déjà filtré par `accountType`)                       | Ajouter les catégories pro à `CATEGORY_HINTS` et n'envoyer à l'IA que les catégories du type de compte                       |
| `personal.periods` / filtre « imports VALIDATED »                                    | Factorisé en helper commun (`validatedTransactions(userId, accountType)`)                                                    |
| `TransactionsTable` (Perso)                                                          | Déplacé dans `src/components/` et **harmonisé** (voir § 4) : un seul composant pour Perso et Pro                             |
| Sélecteur de période (`personal-dashboard.tsx`)                                      | Extrait en `PeriodPicker` + hook `usePeriodSelection` partagés                                                               |
| `Kpi` / `Line` (`kpi-cards.tsx`), tooltip « ? » de `EnvelopeGauge`                   | Extraits en `KpiCard`, `InfoTip`                                                                                             |
| `EnvelopeGauge` (barre = réel, trait = cible)                                        | Généralisé en `TargetGauge` (ton : « au-dessus = bien » ou « au-dessus = mal ») : CA, factures, catégories, frais mixtes, km |
| `FIXED_CHARGES_CATEGORIES` (RENT, ENERGY, TELECOM, INTERNET) + `PROFESSIONAL_REFUND` | Base des **frais mixtes** : dépenses perso de ces catégories × clé de répartition                                            |
| Pattern « barème IR par année » (table + seed + formulaire Réglages)                 | Même pattern pour les **règles pro par année**                                                                               |
| `formatCents`, `fr`, `plural`, `appError`, thème Mantine                             | Tel quel                                                                                                                     |

---

## 3. Décisions d'architecture

1. **Catégories pro dans l'enum existant `TransactionCategory`** (pas de 2ᵉ enum, pas de table) : la relecture,
   `setCategory`, la catégorisation et `fr.categories` marchent sans duplication. Une nouvelle règle
   `CATEGORIES_BY_ACCOUNT_TYPE` (dans `shared/`) dit quelles catégories sont proposées pour un compte perso / pro
   (select de relecture, prompt Gemini, validation Zod de `setCategory`). Valeurs pro distinctes (préfixe `PRO_`
   quand le nom existe côté perso) car leurs règles diffèrent (TVA, groupe du compte de résultat).

   Catégories pro proposées (à valider, § 7) :

   | Groupe                          | Catégories                                                                                                                                                                                                                                                               |
   | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | Encaissements                   | `CLIENT_PAYMENT` (VIR DAVIDSON…), `PRO_OTHER_CREDIT`                                                                                                                                                                                                                     |
   | Charges pro (TVA par catégorie) | `PRO_INSURANCE` (RC Pro, AIG, 0 %), `PRO_ACCOUNTANT` (IDEOZ, 20 %), `PRO_BANK_FEES` (Atout Pro, frais étranger, 0 %), `PRO_EQUIPMENT` (20 %), `PRO_SOFTWARE` (Claude, Figma, GitKraken, 20 %), `PRO_MEALS` (10 %), `PRO_TRAVEL` (SNCF, Ilévia, 10 %), `PRO_OTHER` (20 %) |
   | Rémunération                    | `NET_SALARY_TRANSFER` (salaire net viré), `BNC_WITHDRAWAL` (« complément bnc »), `MIXED_COSTS_REFUND` (remboursement frais mixtes)                                                                                                                                       |
   | Cotisations                     | `URSSAF`, `SUPPLEMENTARY_PENSION` (Malakoff), `HEALTH_COVER` + `DISABILITY_COVER` (SwissLife), `WITHHOLDING_TAX` (DGFIP PAS-DSN)                                                                                                                                         |
   | Fiscalité                       | `VAT_PAYMENT` (DGFIP / SIE TVA)                                                                                                                                                                                                                                          |

2. **Règles pro dans `shared/pro-rules.ts`** (même philosophie que `budget-rules.ts`, sans libellé) :
   groupe de chaque catégorie pro, taux de TVA déductible (en points de base), catégories « frais mixtes »
   (`RENT` → clé surface, `INTERNET`/`TELECOM`/`ENERGY` → clé n/d), répartition indicative des cotisations
   patronales (URSSAF / retraite / santé / prévoyance), taux de TVA collectée (20 %).

3. **Calcul pur et testable, séparé des requêtes** :

   ```
   server/lib/pro/
     load-period.ts        # requêtes Prisma d'un mois ou d'une année (transactions pro + perso, prévisionnel, réglages, trajets)
     compute-month.ts      # PUR : entrées d'un mois → { forecast, actual | null, billing, vat, profit, mixedCosts, mileage }
     regimes/
       types.ts            # interface ProRegime (bénéfice, cotisations, charges sociales…)
       sas-ir.ts           # seule implémentation V1 ; IS / EURL = un fichier de plus plus tard
     match-payments.ts     # rapprochement factures ↔ crédits CLIENT_PAYMENT
     allocate-refunds.ts   # répartition des remboursements frais mixtes sur loyer / internet / tél / énergie
   ```

   La **vue année = 12 × `computeMonth`** (aucune logique dupliquée). Le régime est choisi depuis les réglages
   de l'année : changer de statut plus tard = ajouter un `ProRegime`, sans toucher aux composants.

4. **Nouveau modèle de données** (une migration, tout porte `userId`) :

   | Modèle            | Champs clés                                                                                                                                                                                                                                                                                                                                                                   |
   | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `ProYearSettings` | `userId`, `year` (PK composée), `regime` (enum `CompanyRegime` : `SAS_IR` / `SAS_IS` / `EURL`), `irOptionFirstYear`, `grossSalaryCents`, taux en **points de base** (Int : 4460 = 44,60 %) : patronal, salarial, net imposable, PAS, charges sociales ; `officeAreaDm2`, `homeAreaDm2` ; `mixedKeyNumerator`, `mixedKeyDenominator` ; `mileageRateMilli` (millièmes d'€ / km) |
   | `Client`          | `name`, `bankLabelKeyword` (pour le rapprochement), `defaultDailyRateCents`                                                                                                                                                                                                                                                                                                   |
   | `BillingLine`     | `year`, `month`, `kind` (`FORECAST` / `ACTUAL`), `clientId`, `dailyRateCents`, `halfDays` (Int : 0,5 j de pas)                                                                                                                                                                                                                                                                |
   | `MonthlyForecast` | `year`, `month`, `category` (`TransactionCategory`), `amountCents` — sert aux charges pro, au BNC prévu **et** aux dépenses perso prévues des frais mixtes (catégories RENT…)                                                                                                                                                                                                 |
   | `MileageForecast` | `year`, `month`, `km`                                                                                                                                                                                                                                                                                                                                                         |
   | `Trip`            | `date`, `route`, `reason`, `km`                                                                                                                                                                                                                                                                                                                                               |

   Pas de float : centimes, points de base, demi-journées, dm², millièmes d'euro.
   **Valeurs par défaut non stockées** (calculées à la lecture) : frais mixtes et km prévus = réel du même mois N-1 ;
   une ligne en base = une valeur modifiée (« modifié » dans l'éditeur, « Revenir aux valeurs N-1 » = suppression).

5. **API tRPC** (toujours `protectedProcedure`, filtrées sur `ctx.session.user.id`) :
   - `professional.periods` · `professional.month({ year, month })` · `professional.year({ year })` (lecture seule) ;
   - `proForecast.*` : `billingLines/setBillingLines`, `charges/setCharges`, `mixedCosts/setMixedCosts/resetMixedCosts`,
     `mileage/setMileage`, `copyToFollowingMonths({ year, month, section })` ;
   - `trip.list/create/delete` ; `client.list/create/update` ;
   - `settings.proYear({ year })` (renvoie aussi l'année d'origine si valeurs reprises) / `settings.setProYear`.

6. **Front** :

   ```
   src/components/                 # partagés Perso + Pro
     transactions-table.tsx        # harmonisé (§ 4)
     period-picker.tsx             # Mois/Année + flèches + liste des mois
     kpi-card.tsx, info-tip.tsx, target-gauge.tsx
   src/features/professional/
     components/
       professional-dashboard.tsx  # en-tête + bascule mois / année (≈ personal-dashboard)
       month/ revenue-kpi-card · vat-card · profit-card · billing-card · category-forecast-table · mixed-costs-card · mileage-card
       year/  year-kpis · revenue-chart · income-statement-table · year-categories-table · year-mixed-costs · year-mileage
       forecast-editor/ forecast-editor-modal · billing-tab · charges-tab · mixed-costs-tab · mileage-tab
     hooks/ use-professional.ts · use-forecast-editor.ts · use-trips.ts
   src/features/settings/components/ pro-year-settings-form.tsx
   src/lib/i18n/fr/professional.ts  # sort de settings.ts
   ```

   Graphiques (histogramme CA, km) en **CSS** comme les jauges actuelles : pas de nouvelle dépendance.
   État des formulaires : `useState` / `useReducer` + mutations TanStack Query (pas de lib de state).

---

## 4. Harmonisation du tableau des transactions (Perso = Pro)

La maquette utilise **le même composant** des deux côtés (code identique). Cible pour `src/components/transactions-table.tsx` :

- En-tête « Transactions du mois » + **résumé** : « 42 transactions · crédits + 3 003,50 € · débits − 1 820,40 € » ;
- **Filtres** (boutons à bascule avec compteurs) : Toutes (n) · Crédits (n) · Débits (n) · À vérifier (n) ;
- Colonnes triables Date / Libellé / Catégorie / Montant (défaut : date décroissante ; 1ᵉʳ clic sur Date / Montant = décroissant) ;
- Badge **« À vérifier »** à côté de la catégorie ; montant signé « + » / « − », crédits en vert (token), débits en texte ;
- Message vide paramétrable (« Aucune transaction pour ce filtre. » / « Mois à venir : … après l'import du relevé. ») ;
- `id="transactions"` pour l'ancre « Transactions (N) » de l'en-tête Pro.

« À vérifier » dans un dashboard (que des imports validés) : règle dans `shared/` = **sans catégorie ou catégorie
« Autres »** (`OTHER`, `PRO_OTHER`), comme dans les données de la maquette (hypothèse, § 7).
Le composant reçoit des lignes déjà prêtes (`{ id, date, label, category, amountCents }`) : aucune dépendance au domaine.

---

## 5. Découpage en PR (empilées, chacune relisible en quelques minutes)

### Phase 0 — Préparation (sans nouvelle fonctionnalité)

| #   | Branche                           | Contenu                                                                                                                        |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `feat/shared-transactions-table`  | Tableau déplacé dans `src/components/` + filtres, résumé, badge « À vérifier », couleurs (§ 4). Visible dans Perso.            |
| 2   | `refactor/shared-dashboard-ui`    | Extraction `PeriodPicker` + `usePeriodSelection`, `KpiCard`, `InfoTip`, `TargetGauge` ; Perso branché dessus, rendu identique. |
| 3   | `refactor/validated-transactions` | Helper serveur `validatedTransactions(userId, accountType)` + `periodsOf(accountType)` ; `personal` l'utilise.                 |

### Phase 1 — Fondations Pro

| #   | Branche                    | Contenu                                                                                                                                                                                  |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | `feat/pro-categories`      | Catégories pro (enum + migration + `fr/enums.ts` + `CATEGORY_HINTS`) + `CATEGORIES_BY_ACCOUNT_TYPE` ; relecture et Gemini filtrés par type. **Les imports pro deviennent exploitables.** |
| 5   | `feat/settings-tabs`       | Réglages en onglets Perso / Pro · Stygma (`Tabs` Mantine) ; onglet Perso = formulaires existants ; onglet Pro vide.                                                                      |
| 6   | `feat/pro-year-settings`   | Modèle `ProYearSettings` + `CompanyRegime` + seed 2026 (valeurs de la maquette) + routes `settings.proYear/setProYear` (héritage de l'année précédente) + formulaire.                    |
| 7   | `feat/pro-forecast-schema` | Modèles `Client`, `BillingLine`, `MonthlyForecast`, `MileageForecast`, `Trip` (migration seule) + `shared/pro-rules.ts`.                                                                 |
| 8   | `feat/pro-compute`         | `server/lib/pro/` : `compute-month`, `regimes/sas-ir`, `match-payments`, `allocate-refunds` (pur) + tests unitaires (§ 7).                                                               |

### Phase 2 — Dashboard Pro, vue mois (lecture)

| #   | Branche                        | Contenu                                                                                                                                       |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | `feat/pro-month-overview`      | `load-period` + `professional.periods/month` ; page : en-tête, `PeriodPicker`, bandeau « mois à venir », KPI CA HT, tableau des transactions. |
| 10  | `feat/pro-vat-profit`          | Cartes TVA à reverser + Bénéfice (équation, barre de répartition, BNC, reste en trésorerie, charges sociales).                                |
| 11  | `feat/pro-billing-card`        | Facturation & encaissements (statuts via rapprochement).                                                                                      |
| 12  | `feat/pro-category-table`      | Prévisionnel vs réel par catégorie (3 groupes + total).                                                                                       |
| 13  | `feat/pro-mixed-costs-mileage` | Cartes Frais mixtes et Frais km (+ journal des trajets en lecture).                                                                           |

### Phase 3 — Saisie du prévisionnel

| #   | Branche                        | Contenu                                                                                                                                      |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | `feat/pro-clients`             | `client.*` (liste / création / mot-clé bancaire), utilisé par la facturation.                                                                |
| 15  | `feat/forecast-editor-billing` | Modale « Éditer le prévisionnel » + onglet Facturation (Prévu / Réel), « Appliquer aux mois suivants », bouton « Saisir jours & TJM réels ». |
| 16  | `feat/forecast-editor-charges` | Onglet Charges & rémunération (+ BNC prévu).                                                                                                 |
| 17  | `feat/forecast-editor-mixed`   | Onglet Frais mixtes (pré-rempli N-1, « modifié », revenir aux valeurs N-1).                                                                  |
| 18  | `feat/forecast-editor-mileage` | Onglet Frais km + « Ajouter un trajet » (`trip.*`).                                                                                          |

### Phase 4 — Vue année

| #   | Branche                     | Contenu                                                                          |
| --- | --------------------------- | -------------------------------------------------------------------------------- |
| 19  | `feat/pro-year-overview`    | `professional.year` (12 × `computeMonth`) + KPI année + histogramme CA HT (CSS). |
| 20  | `feat/pro-income-statement` | Compte de résultat simplifié (12 mois + Final, prévisionnel en italique).        |
| 21  | `feat/pro-year-details`     | Catégories année, frais mixtes année, frais km année.                            |

### Phase 5 — Clôture

| #   | Branche          | Contenu                                                                                                                                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22  | `chore/docs-pro` | `docs/fonctionnel.md` (section Pro), `docs/technique.md` (routeurs, modèles), `CLAUDE.md` (roadmap, décisions), slash command `/add-pro-card` si le pattern carte s'est répété. |

Chaque PR : `pnpm check` + `pnpm build` verts, section « Notes React » (ex. PR 2 : extraction de composants ≈
composants Vue partagés ; PR 15 : `useReducer` pour l'éditeur ≈ état local d'un formulaire Vue ; modale contrôlée ≈ `v-model:opened`).

---

## 6. Règles de calcul retenues (V1, SAS à l'IR)

- **Mois « réel »** : mois ≤ mois en cours ; au-delà, prévisionnel seul (bandeau + valeurs grisées).
- **CA HT** = Σ jours × TJM des lignes de facturation (`ACTUAL` pour le réel, `FORECAST` pour le prévu), rattaché au mois de la prestation.
- **Encaissé** = crédits `CLIENT_PAYMENT` rapprochés : libellé contenant le mot-clé du client, sur le mois de la facture et les 2 suivants.
- **Charges pro HT réelles** = débits des catégories de charges pro ramenés en HT avec le taux de TVA de la catégorie ; TVA déductible = la différence.
- **TVA à reverser** = 20 % × CA HT − TVA déductible (calculée par mois, comme la maquette ; la règle d'exigibilité à l'encaissement reste en info-bulle). Ligne « TVA » de Fiscalité = prévu : TVA due du mois précédent ; réel : débits `VAT_PAYMENT`.
- **Salaires bruts / cotisations patronales** : depuis Réglages (brut × taux) ; les prélèvements URSSAF / Malakoff / SwissLife / PAS sont catégorisés et affichés mais **n'entrent pas dans les charges** (évite le double comptage).
- **Bénéfice** = CA HT − charges pro − salaires bruts − cotisations patronales ; **reste en trésorerie** = bénéfice − BNC prélevés ; **charges sociales sur bénéfice** = taux × max(0, bénéfice).
- **Frais mixtes** : dû = dépense perso du mois × clé (loyer : surface bureau / logement ; autres : n/d) ; payé = débits pro `MIXED_COSTS_REFUND`, répartis dans l'ordre loyer → internet → téléphone → énergie.
- **Km** : réel = Σ trajets du mois ; prévu = valeur saisie, sinon km réels du même mois N-1 ; montant = km × barème de l'année.

---

## 7. Questions ouvertes (hypothèse appliquée si pas de réponse)

1. **Catégories pro** : la liste du § 3 te va ? (ajout de `PRO_SOFTWARE` absent de la maquette, alors que Claude / Figma / GitKraken sont nombreux dans le relevé) — _hypothèse : oui._
2. **Cotisations réelles** : calculées depuis Réglages (maquette) plutôt que lues dans les prélèvements URSSAF / Malakoff / SwissLife ? — _hypothèse : Réglages en V1._
3. **Prévu des charges pro** sans saisie : 0 €, ou réel du même mois N-1 (comme frais mixtes et km) ? — _hypothèse : réel N-1, même règle partout._
4. **Clients** : table `Client` (nom + mot-clé bancaire pour le rapprochement) plutôt que le texte libre de la maquette ? — _hypothèse : oui._
5. **« À vérifier » dans les dashboards** = sans catégorie ou « Autres » ? — _hypothèse : oui._
6. **Tests unitaires** : ajouter Vitest (dev-dependency) uniquement pour `server/lib/pro/` (calculs financiers) ? — _hypothèse : oui, PR 8._
7. **Années du régime** dans Réglages : liste fixe 2025 → 2028 (maquette) ou années ayant des données + année suivante ? — _hypothèse : années avec données + suivante._

---

## 8. Écarts maquette ↔ app à garder en tête

- La barre latérale de l'artboard Pro n'a pas l'entrée **Imports** : garder celle de l'app (`MAIN_NAV`).
- Sélecteur de mois Pro = flèches seules ; on réutilise le `PeriodPicker` Perso (liste déroulante en plus) pour l'homogénéité, avec les 12 mois de l'année (mois futurs inclus).
- Les valeurs de la maquette (TJM 450, Nexity, 800 € brut, 44,6 %…) sont des **exemples** : seul le seed 2026 des règles pro les reprend, à corriger dans Réglages.
- Le bouton d'import Pro pointe vers `/imports/new` avec le type **Pro** présélectionné (`?accountType=PROFESSIONAL`).
