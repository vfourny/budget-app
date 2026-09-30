# Règles fonctionnelles

Ce document décrit **ce que fait l'app** et les règles métier à respecter. Les détails d'implémentation sont dans [technique.md](./technique.md).

## Principe : la méthode des enveloppes

Chaque dépense est rattachée à une **catégorie**, chaque catégorie à une **enveloppe**. Le budget se pilote par enveloppe : on compare, pour un mois, l'enveloppe **recommandée** au **réel** dépensé.

### Enveloppes

Définies dans l'enum Prisma `Envelope` et les libellés dans `src/lib/envelopes.ts` (l'ordre des clés = ordre d'affichage).

| Enveloppe          | Code                 |
| ------------------ | -------------------- |
| Dépenses courantes | `DEPENSES_COURANTES` |
| Loisirs            | `LOISIRS`            |
| Formation          | `FORMATION`          |
| Épargne sécurité   | `EPARGNE_SECURITE`   |
| Épargne long terme | `EPARGNE_LONG_TERME` |
| Pro                | `PRO`                |

### Catégories de transaction

Liste **figée** (enum Prisma `TransactionCategory`), reprise des colonnes de l'ancien Google Sheet. Libellé affiché et enveloppe de rattachement : `src/lib/categories.ts`.

| Catégorie           | Code                 | Enveloppe          |
| ------------------- | -------------------- | ------------------ |
| Essence             | `ESSENCE`            | Dépenses courantes |
| Banque et assurance | `ASSURANCE`          | Dépenses courantes |
| Restaurant          | `RESTAURANT`         | Loisirs            |
| Alimentaire         | `ALIMENTAIRE`        | Dépenses courantes |
| Soirée              | `SOIREE`             | Loisirs            |
| Loisirs             | `LOISIRS`            | Loisirs            |
| Vêtements & Soins   | `VETEMENTS_SOINS`    | Dépenses courantes |
| Santé               | `SANTE`              | Dépenses courantes |
| Transport           | `TRANSPORT`          | Dépenses courantes |
| Impôt et Taxes      | `IMPOTS_TAXES`       | Dépenses courantes |
| Abonnements divers  | `AUTRES_ABONNEMENTS` | Dépenses courantes |
| Autres              | `AUTRES`             | Dépenses courantes |
| Épargne long terme  | `EPARGNE_LONG_TERME` | Épargne long terme |

Points d'attention :

- Le rattachement catégorie → enveloppe est une **hypothèse à ajuster** dans `src/lib/categories.ts` (un seul endroit à modifier).
- Les enveloppes `FORMATION`, `EPARGNE_SECURITE` et `PRO` n'ont **pas encore de catégorie** rattachée.
- La catégorie d'une transaction est **optionnelle** (`null` tant qu'elle n'est pas catégorisée / relue).
- Ajouter ou renommer une catégorie = modifier l'enum Prisma **+ une migration versionnée + `src/lib/categories.ts`** (le typage `Record<TransactionCategory, …>` fait échouer `tsc` si l'un des deux est oublié).

## Comptes bancaires

Un `BankAccount` a un **type** (`PERSO` ou `PRO`) et une **banque** (`bank`). Le type vient du compte, jamais de la transaction : cela permet plusieurs comptes par type.

Comptes créés par le seed :

| Nom                  | Type    | Banque           |
| -------------------- | ------- | ---------------- |
| Compte courant perso | `PERSO` | BoursoBank       |
| Compte pro Stygma    | `PRO`   | Banque Populaire |

Le champ `bank` sert aussi à **choisir automatiquement le mapping CSV** à l'import (voir [import-csv.md](./import-csv.md)).

## Transactions

- **Montant** : entier en **centimes**, **signé** — négatif = débit, positif = crédit. Jamais de float.
- **Date** : la date d'opération (sans heure).
- **Mois / année** : dénormalisés depuis la date (`month` 1-12, `year`) pour les agrégations rapides.
- **Libellé** : texte brut de la banque (ou libellé enrichi, voir import), sert de contexte à la catégorisation automatique.

## Cycle de vie d'un import

```
Upload CSV → parsing → ImportBatch (PENDING_REVIEW) → catégorisation Claude
          → relecture / correction inline → « Valider » → ImportBatch (VALIDATED)
```

1. **Upload** : l'utilisateur choisit le compte bancaire et dépose le CSV de la banque.
2. **Parsing** : le mapping de la banque (via `BankAccount.bank`) transforme les lignes en transactions normalisées. Une ligne illisible est **écartée et signalée** (numéro de ligne + contenu brut) sans bloquer les autres.
3. **Catégorisation** : l'API Claude propose une catégorie (valeur de l'enum) avec un score de `confidence`, en s'appuyant sur des exemples de transactions déjà validées (few-shot).
4. **Relecture** : tableau éditable groupé par import, correction inline, mise en avant des lignes à faible confiance ou en erreur.
5. **Validation** : statut `VALIDATED` + `validatedAt`. Les transactions ne sont écrites en base qu'à cette étape.

Règles :

- Supprimer un `ImportBatch` **supprime ses transactions** (cascade).
- Une transaction peut ne pas avoir d'`ImportBatch` (`importBatchId` nullable, ex. saisie manuelle future).
- Les corrections validées alimentent les exemples few-shot des imports suivants : plus l'historique grandit, plus la catégorisation est juste.

> État actuel : le parseur est en place. Route d'import, catégorisation et relecture sont à venir (voir la roadmap dans [`CLAUDE.md`](../CLAUDE.md)).

## Dashboards (à venir)

- **Vue mois** : dépenses par catégorie et par enveloppe, **enveloppe recommandée vs réel** (couleur ambre en cas de dépassement ou de ligne à vérifier).
- **Vue année** : même agrégation sur douze mois — l'historique mois / année est central dans l'app.
- Mockup de référence : canvas Claude Design « Budget — maquette MVP » (5 écrans : tableau de bord mois, import CSV, relecture, vue année, tokens).

## Partie pro Stygma (après validation du MVP perso)

Suivi compta du compte pro : TVA, facturation, prévisionnel / réel. **Hors scope de la v1.**
