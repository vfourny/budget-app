# Règles fonctionnelles

Ce document décrit **ce que fait l'app** et les règles métier à respecter. Les détails d'implémentation sont dans [technique.md](./technique.md).

## Principe : la méthode des enveloppes

Chaque dépense est rattachée à une **catégorie**, chaque catégorie à une **enveloppe**. Le budget se pilote par enveloppe : on compare, pour un mois, l'enveloppe **recommandée** au **réel** dépensé.

### Enveloppes

Définies dans l'enum Prisma `Envelope` et les libellés dans `src/lib/envelopes.ts` (l'ordre des clés = ordre d'affichage). Les libellés sont préfixés « Enveloppe » pour ne pas les confondre avec une catégorie du même nom (Loisirs, Formation).

| Enveloppe                    | Code                |
| ---------------------------- | ------------------- |
| Enveloppe dépenses courantes | `CURRENT_EXPENSES`  |
| Enveloppe loisirs            | `LEISURE`           |
| Enveloppe formation          | `TRAINING`          |
| Enveloppe épargne sécurité   | `SAFETY_SAVINGS`    |
| Enveloppe épargne long terme | `LONG_TERM_SAVINGS` |

### Catégories de transaction

Liste **figée** (enum Prisma `TransactionCategory`), reprise des colonnes de l'ancien Google Sheet. Libellé affiché et enveloppe de rattachement : `src/lib/categories.ts`.

| Catégorie           | Code                  | Enveloppe          |
| ------------------- | --------------------- | ------------------ |
| Loyer               | `RENT`                | Dépenses courantes |
| Essence             | `FUEL`                | Dépenses courantes |
| Banque et assurance | `BANK_INSURANCE`      | Dépenses courantes |
| Restaurant          | `RESTAURANT`          | Loisirs            |
| Alimentaire         | `GROCERIES`           | Dépenses courantes |
| Soirée              | `NIGHTLIFE`           | Loisirs            |
| Loisirs             | `LEISURE`             | Loisirs            |
| Formation           | `TRAINING`            | Formation          |
| Vêtements & Soins   | `CLOTHING_CARE`       | Dépenses courantes |
| Santé               | `HEALTH`              | Dépenses courantes |
| Transport           | `TRANSPORT`           | Dépenses courantes |
| Impôt et Taxes      | `TAXES`               | Dépenses courantes |
| Abonnements divers  | `OTHER_SUBSCRIPTIONS` | Dépenses courantes |
| Autres              | `OTHER`               | Dépenses courantes |
| Épargne court terme | `SHORT_TERM_SAVINGS`  | Épargne sécurité   |
| Épargne long terme  | `LONG_TERM_SAVINGS`   | Épargne long terme |
| Versement salaire   | `SALARY_PAYMENT`      | — (revenu)         |
| Versement BNC       | `BNC_PAYMENT`         | — (revenu)         |
| Versement vacation  | `VACATION_PAYMENT`    | — (revenu)         |
| Autre remboursement | `REFUND`              | — (crédit)         |
| Remboursement pro   | `PROFESSIONAL_REFUND` | — (crédit)         |

Points d'attention :

- **Toutes les règles modifiables** sont dans `src/lib/budget-rules.ts` : catégories cumulées dans chaque enveloppe (`ENVELOPE_CATEGORIES`), enveloppes d'épargne, catégories affichées dans la card « Par catégorie » (`CATEGORY_CARD_CATEGORIES`), lignes de la card Revenus (`REVENUE_LINES`). Une règle modifiée s'applique à tout l'historique (rien n'est stocké en base). La colonne « Enveloppe » du tableau ci-dessus est indicative : la source de vérité est ce fichier.
- La catégorie d'une transaction est **optionnelle** (`null` tant qu'elle n'est pas catégorisée / relue).
- Ajouter ou renommer une catégorie = modifier l'enum Prisma **+ une migration versionnée + `src/lib/categories.ts` + `server/lib/categorize/category-hints.ts`**, puis la ranger dans `src/lib/budget-rules.ts` (le typage `Record<TransactionCategory, …>` fait échouer `tsc` si l'un des deux est oublié).

## Type de compte

Chaque import et chaque transaction porte un **type** : `PERSONAL` ou `PROFESSIONAL` (Stygma). C'est la seule notion de « compte » de l'app : il n'y a pas de table de comptes bancaires. La banque n'est pas stockée ; elle sert uniquement à choisir le **mapping CSV** à l'import (voir [import-csv.md](./import-csv.md)) et se déduit du type :

| Type           | Banque (format CSV) |
| -------------- | ------------------- |
| `PERSONAL`     | BoursoBank          |
| `PROFESSIONAL` | Banque Populaire    |

Évolution prévue (gestion des appartements) : une catégorie « appartement » et un rattachement choisi par transaction à la relecture (`apartmentId` optionnel), indépendamment du compte bancaire d'origine.

## Transactions

- **Montant** : entier en **centimes**, **signé** — négatif = débit, positif = crédit. Jamais de float.
- **Date** : la date d'opération (sans heure).
- **Mois / année** : dénormalisés depuis la date (`month` 1-12, `year`) pour les agrégations rapides.
- **Libellé** : texte brut de la banque (ou libellé enrichi, voir import), sert de contexte à la catégorisation automatique.

## Cycle de vie d'un import

```
Upload CSV → parsing → ImportBatch (PENDING_REVIEW) → catégorisation Gemini
          → relecture / correction inline → « Valider » → ImportBatch (VALIDATED)
```

1. **Upload** : l'utilisateur choisit le type de compte (perso / pro) et dépose le CSV de la banque.
2. **Parsing** (route `import.create`) : le mapping de la banque (déduit du type de compte) transforme les lignes en transactions normalisées. Une ligne illisible est **écartée et signalée** (numéro de ligne + contenu brut) sans bloquer les autres. Les lignes **déjà importées** (relevés qui se chevauchent) sont écartées aussi, voir [import-csv.md](./import-csv.md).
3. **Catégorisation** (route `categorize.run`) : l'API Gemini (Flash-Lite, palier gratuit) propose une catégorie (valeur de l'enum) avec un score de `confidence` (0 à 1, stocké dans `Transaction.categoryConfidence`), en s'appuyant sur des exemples de transactions déjà validées du même type de compte (few-shot, vide au tout premier import). Sous **0,7** de confiance, la ligne ira dans « À vérifier ». Relançable : seules les lignes encore sans catégorie sont traitées ; si l'appel à l'IA échoue, rien n'est écrit.
4. **Relecture** (`/imports/:id`) : la catégorisation part automatiquement juste après l'import, puis on arrive sur le tableau. Les lignes « à vérifier » (sans catégorie ou confiance < 0,7) sont surlignées ; chaque ligne a un sélecteur de catégorie (un choix manuel = « Confirmée »). Filtre Toutes / À vérifier.
5. **Validation** : statut `VALIDATED` + `validatedAt`. Les transactions sont écrites en base **dès l'import** (sans catégorie, rattachées à l'`ImportBatch`) pour que la relecture survive à un rechargement de page ; **seuls les imports `VALIDATED` comptent dans les dashboards**. « Valider » reste désactivé tant qu'une ligne est sans catégorie ou à faible confiance ; après validation on revient à l'historique, où un import (validé ou non) peut être supprimé avec ses lignes. « Catégoriser avec l'IA » relance `categorize.run` si l'appel a échoué à l'import.

Règles :

- Supprimer un `ImportBatch` **supprime ses transactions** (cascade).
- Une transaction peut ne pas avoir d'`ImportBatch` (`importBatchId` nullable, ex. saisie manuelle future).
- Les corrections validées alimentent les exemples few-shot des imports suivants : plus l'historique grandit, plus la catégorisation est juste.

> État actuel : import, catégorisation automatique, historique et relecture (correction) sont en place ; validation et suppression aussi (voir la roadmap dans [`CLAUDE.md`](../CLAUDE.md)).

## Dashboard Perso (`/personal`)

Ne compte que les transactions des imports **VALIDATED** du compte perso. Hypothèses V1 : tout crédit est un **revenu** ; un débit en catégorie « Épargne court terme » ou « Épargne long terme » est de l'**épargne** (pas une dépense) ; le reste des débits sont des **dépenses**.

- **Vue mois** : sélecteur de mois (et flèches) limité aux mois qui ont des données ; cartes Dépenses (avec, par enveloppe, une jauge **réel vs recommandé** : barre verte si on reste sous la part recommandée du revenu, ambre au-delà ; l'inverse pour l'épargne), Revenus (détail : Salaire = `SALARY_PAYMENT` + `BNC_PAYMENT`, Vacations, Remboursement pro, Autre remboursement, + « Autres » s'il reste des crédits non rangés), Épargne du mois (+ % des revenus) ; tableau des transactions triable ; dépenses par catégorie.
- **Vue année** : mêmes totaux sur l'année choisie, plus la dépense moyenne par mois (mois ayant des données).
- Les parts recommandées (méthode des 5 comptes, 60 / 10 / 10 / 10 / 10 % par défaut) se règlent dans **Réglages** (le total doit faire exactement 100 %). Les 5 enveloppes sont toujours affichées avec leur jauge, même à 0 €.
- **À venir** : carte Abonnements, donut par catégorie en vue année, estimation de l'IR.
- Mockup de référence : canvas Claude Design « Budget — maquette MVP » (5 écrans : tableau de bord mois, import CSV, relecture, vue année, tokens).

## Partie pro Stygma (après validation du MVP perso)

Suivi compta du compte pro : TVA, facturation, prévisionnel / réel. **Hors scope de la v1.**
