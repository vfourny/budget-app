# Import CSV

Le parseur transforme un relevé bancaire CSV en transactions normalisées. Il vit dans `server/lib/csv/` et est **générique** : chaque banque n'apporte qu'un fichier de mapping de colonnes.

```
server/lib/csv/
  types.ts                 # ParsedTransaction, BankCsvConfig, AmountColumns…
  parse-bank-statement.ts  # parseBankStatement(csvText, config)
  banks/
    index.ts               # BANK_CSV_CONFIGS + getBankCsvConfig(bank)
    boursobank.ts
    banque-populaire.ts
```

## Utilisation

```ts
import { getBankCsvConfig } from "@server/lib/csv/banks";
import { parseBankStatement } from "@server/lib/csv/parse-bank-statement";

const config = getBankCsvConfig(accountType); // PERSO → BoursoBank, PRO → Banque Populaire
const { transactions, errors } = parseBankStatement(csvText, config);
```

Le mapping est choisi par le type de compte, via `BANK_BY_ACCOUNT_TYPE` (`banks/index.ts`) qui pointe vers une clé de `BANK_CSV_CONFIGS` (= `BankCsvConfig.bank`). La banque n'est pas stockée en base.

## Route tRPC `import.create`

Entrée : `{ accountType, fileName, csvText }` (CSV lu côté navigateur, UTF-8, ≤ 2 Mo). Le serveur déduit la banque du type de compte, parse, puis crée en une seule écriture un `ImportBatch` (`PENDING_REVIEW`) et ses `Transaction` **sans catégorie**. Sortie : `{ batchId, importedCount, errors }`.

- Fichier sans aucune ligne lisible → `BAD_REQUEST` (rien n'est écrit).
- Les lignes illisibles sont renvoyées dans `errors` sans bloquer l'import.
- **Doublons** : à l'import, une ligne (même compte, même jour, même montant, même libellé) déjà présente en base est écartée ; la comparaison est en multi-ensemble (deux achats identiques le même jour restent deux lignes). Un relevé entièrement déjà importé est refusé. Un relevé qui chevauche un précédent n'ajoute que ses nouvelles lignes (`duplicateCount` renvoyé et signalé dans l'écran d'import). Limite : si le libellé d'une même opération change d'un export à l'autre, elle n'est pas reconnue.

## Sortie

- `transactions` : `{ date, label, amountCents, month, year }` (date en UTC ; `accountType`, `category` et `importBatchId` sont ajoutés plus tard).
- `errors` : `{ line, message, raw }` — `line` est le numéro de ligne dans le fichier source (1-based, en-tête compris).

**Une ligne illisible (date ou montant invalide) est écartée et reportée dans `errors`** au lieu d'interrompre tout l'import. L'écran de relecture pourra la signaler pour correction manuelle.

## Règles de parsing

- Lignes vides ignorées ; fins de ligne `\n` ou `\r\n`.
- Découpage CSV maison : les champs entre guillemets peuvent contenir le délimiteur, et `""` dans un champ cité est un guillemet échappé.
- Montants : espaces supprimés (séparateur de milliers), séparateur décimal normalisé, arrondi en **centimes**. Exemples : `-1 500,00` → `-150000`, `+8640,00` → `864000`.
- Deux modes d'extraction du montant : `signed` (une colonne déjà signée) ou `debitCredit` (deux colonnes déjà signées, une seule renseignée par ligne).
- Formats de date : `yyyy-mm-dd` ou `dd/mm/yyyy`.
- Le libellé peut être une colonne ou une fonction qui compose plusieurs champs (plus de contexte pour la catégorisation automatique).

## Banques supportées

| Banque           | Compte       | Délimiteur | Date         | Montant                            | Libellé                                          |
| ---------------- | ------------ | ---------- | ------------ | ---------------------------------- | ------------------------------------------------ |
| BoursoBank       | Perso        | `;`        | `yyyy-mm-dd` | colonne 6, signée                  | colonne 2 (libellé brut)                         |
| Banque Populaire | Pro (Stygma) | `;`        | `dd/mm/yyyy` | débit colonne 5 / crédit colonne 6 | libellé simplifié + informations complémentaires |

Les deux mappings ont été validés sur de vrais exports (867 lignes BoursoBank, 140 lignes Banque Populaire, 0 erreur).

### Particularité BoursoBank

L'en-tête de l'export contient la colonne **« Solde » en double** (bug d'export côté BoursoBank) : la 1re occurrence (colonne 6) est en réalité le **montant de l'opération**, la 2e (colonne 10) est le vrai solde courant. D'où un mapping **par index** et non par nom d'en-tête. Le libellé brut (colonne 2) est préféré au « Libellé Suggéré » car plus riche pour la catégorisation.

### Particularité Banque Populaire

Export « Relevé de compte » : débit et crédit sont deux colonnes séparées, déjà signées (`-115,00` / `+8640,00`). Le libellé est composé `libellé simplifié — informations complémentaires` quand ces dernières existent (référence facture, tiers…).

## Ajouter une banque

1. Créer `server/lib/csv/banks/<banque>.ts` exportant un `BankCsvConfig` (`bank`, `delimiter`, `hasHeader`, `dateFormat`, `decimalSeparator`, `columns`).
2. Ajouter l'entrée dans `BANK_CSV_CONFIGS` (`banks/index.ts`).
3. Pointer le type de compte concerné vers cette banque dans `BANK_BY_ACCOUNT_TYPE` (`banks/index.ts`).
4. Valider sur un vrai export : **0 erreur de parsing** et montants / dates cohérents avec le relevé.

Ne pas toucher à `parse-bank-statement.ts` pour un besoin propre à une banque : étendre `BankCsvConfig` si le besoin est réellement générique.
