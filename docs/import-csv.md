# Import CSV

Le parseur transforme un relevé bancaire CSV en transactions normalisées. Il vit dans `server/lib/csv/` et est **générique** : il ne connaît aucune banque. Le format des colonnes d'un export est une donnée (`CsvFormat`, en base), retrouvée par l'**empreinte de l'en-tête** du fichier.

```
shared/csv-format.ts          # schéma Zod + type CsvFormatConfig (délimiteur, date, colonnes…)
server/lib/csv/
  types.ts                    # ParsedTransaction, erreurs de ligne
  fingerprint.ts              # csvFingerprint(csvText) : SHA-256 de la 1re ligne
  find-format.ts              # findCsvFormat(userId, csvText) : format connu ou null
  parse-bank-statement.ts     # parseBankStatement(csvText, config)
prisma/seeds/csv-formats.ts   # BoursoBank et Banque Populaire (formats historiques)
```

## Utilisation

```ts
const config = await findCsvFormat(userId, csvText, db); // null si l'en-tête est inconnu
if (!config) throw appError("BAD_REQUEST", "UNKNOWN_CSV_FORMAT");
const { transactions, errors } = parseBankStatement(csvText, config);
```

Le type de compte (perso / pro) ne sert plus à choisir le parseur : il ne détermine que les catégories proposées. Passer à une autre banque ne demande aucun code : son format est détecté puis enregistré (voir « Formats inconnus »).

## `CsvFormat`

Une ligne par utilisateur et par empreinte (`@@unique([userId, fingerprint])`) : `fingerprint`, `name` (indicatif, jamais utilisé pour choisir le parseur) et `config` (JSON validé par `csvFormatConfigSchema` à chaque lecture ; un JSON devenu invalide est traité comme un format inconnu).

`CsvFormatConfig` : `delimiter` (`;` `,` tab), `hasHeader`, `dateFormat` (`yyyy-mm-dd` / `dd/mm/yyyy`), `decimalSeparator`, `dateColumn`, `labelColumns` (colonnes concaténées avec `—`, champs vides ignorés) et `amount` (`signed` : une colonne signée ; `debitCredit` : deux colonnes déjà signées, une seule renseignée par ligne). Les colonnes sont désignées par **index**, pas par nom.

L'empreinte est calculée sur la 1re ligne, sans BOM UTF-8 ni espaces autour : deux exports de la même banque ont le même en-tête, donc la même empreinte. Limite : un fichier **sans en-tête** n'a pas d'empreinte stable (sa 1re ligne est une opération).

## Route tRPC `import.create`

Entrée : `{ accountType, fileName, csvText }` (CSV lu côté navigateur, UTF-8, ≤ 2 Mo). Le serveur retrouve le format par l'empreinte (inconnu → `UNKNOWN_CSV_FORMAT`), parse, puis crée en une seule écriture un `ImportBatch` (`PENDING_REVIEW`) et ses `Transaction` **sans catégorie**. Sortie : `{ batchId, importedCount, errors }`.

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

## Formats historiques (seed)

`pnpm db:seed` (à relancer sur chaque base, develop **et production**) enregistre ces deux formats. Il est idempotent et n'écrase pas un format déjà corrigé.

| Banque           | Compte       | Délimiteur | Date         | Montant                            | Libellé                                          |
| ---------------- | ------------ | ---------- | ------------ | ---------------------------------- | ------------------------------------------------ |
| BoursoBank       | Perso        | `;`        | `yyyy-mm-dd` | colonne 6, signée                  | colonne 2 (libellé brut)                         |
| Banque Populaire | Pro (Stygma) | `;`        | `dd/mm/yyyy` | débit colonne 5 / crédit colonne 6 | libellé simplifié + informations complémentaires |

Validés sur de vrais exports (0 erreur de parsing).

### Particularité BoursoBank

L'en-tête de l'export contient la colonne **« Solde » en double** (bug d'export côté BoursoBank) : la 1re occurrence (colonne 6) est en réalité le **montant de l'opération**, la 2e (colonne 10) est le vrai solde courant. D'où un mapping **par index** et non par nom d'en-tête. Le libellé brut (colonne 2) est préféré au « Libellé Suggéré » car plus riche pour la catégorisation. Le fichier commence par un BOM UTF-8, ignoré par l'empreinte.

### Particularité Banque Populaire

Export « Relevé de compte » : débit et crédit sont deux colonnes séparées, déjà signées (`-115,00` / `+8640,00`). Le libellé est composé `libellé simplifié — informations complémentaires` quand ces dernières existent (référence facture, tiers…).

## Formats inconnus (détection par l'IA)

Un fichier dont l'empreinte n'est pas en base fait échouer `import.create` avec `UNKNOWN_CSV_FORMAT`. L'écran d'import enchaîne alors :

1. `import.detectFormat` (`server/lib/csv/detect-format.ts`) : le délimiteur est deviné en code (séparateur le plus fréquent de la 1re ligne) ; Gemini ne reçoit que l'en-tête et 8 lignes, **déjà découpées et numérotées** (`[0] valeur | [1] valeur…`, pour gérer les noms de colonnes en double), et désigne les colonnes (date, libellés, montant signé ou débit/crédit), le format de date, le séparateur décimal et le nom de la banque. La réponse est validée par `csvFormatConfigSchema` ; une colonne hors du fichier est rejetée. Le parsing des montants reste du code déterministe.
2. Le fichier complet est parsé avec ce mapping : aperçu des 5 premières lignes + contrôles (`checkParsedStatement`) : aucune ligne lisible (bloque la confirmation), lignes illisibles, dates avant 2000 ou dans le futur, libellés vides.
3. L'utilisateur confirme (nom du format modifiable) : `import.create` reçoit `format`, importe, puis enregistre le `CsvFormat` (upsert sur l'empreinte). Les fichiers suivants de la même banque ne passent plus par l'IA.

Rien n'est écrit en base tant que le format n'est pas confirmé et que le fichier n'a pas produit au moins une ligne lisible.

Le parseur force **débit négatif / crédit positif** : les exports qui donnent le débit en positif sont donc lus correctement.

### Limites

- Pas de correction manuelle du mapping : en cas d'erreur, « Relancer la détection » (ou enrichir le prompt).
- Signe d'une colonne `signed` inversé (rare) non géré.
- Fichier sans en-tête : la détection fonctionne (`hasHeader: false`) mais l'empreinte (1re ligne = une opération) ne se retrouve pas : le format est redétecté à chaque import.
- Dates `yyyy-mm-dd` / `dd/mm/yyyy` seulement ; UTF-8 seulement ; pas de lignes d'intro avant l'en-tête.
- Confidentialité : l'en-tête et 8 lignes réelles (libellés, montants) partent chez Gemini, comme pour la catégorisation.
