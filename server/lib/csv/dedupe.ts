import type { ParsedTransaction } from "@server/lib/csv/types";

/** Identité d'une ligne : même jour, même montant, même libellé. */
function transactionKey(transaction: { date: Date; amountCents: number; label: string }): string {
  return `${transaction.date.toISOString().slice(0, 10)}|${transaction.amountCents}|${transaction.label}`;
}

/**
 * Écarte les lignes déjà importées (relevés qui se chevauchent). Comparaison en **multi-ensemble** :
 * deux achats identiques le même jour sont légitimes, donc si la base en contient déjà N, on
 * écarte au plus N occurrences dans le fichier — la (N+1)ᵉ est une vraie nouvelle ligne.
 */
export function removeAlreadyImported(
  parsed: readonly ParsedTransaction[],
  existing: readonly { date: Date; amountCents: number; label: string }[],
): { fresh: ParsedTransaction[]; duplicateCount: number } {
  const remaining = new Map<string, number>();
  for (const transaction of existing) {
    const key = transactionKey(transaction);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  const fresh: ParsedTransaction[] = [];
  let duplicateCount = 0;
  for (const transaction of parsed) {
    const key = transactionKey(transaction);
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      duplicateCount++;
    } else {
      fresh.push(transaction);
    }
  }
  return { fresh, duplicateCount };
}
