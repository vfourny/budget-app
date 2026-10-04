/**
 * Libellé « nettoyé » d'une ligne bancaire : sans date d'opération (`CARTE 27/08/26 …`) ni suffixe
 * de carte (`CB*0264`), qui changent à chaque achat chez le même commerçant. Sert à dédoublonner
 * les exemples few-shot : `CARTE 03/04/26 CARREFOUR CB*0264` et `CARTE 28/05/26 CARREFOUR CB*0264`
 * deviennent le même `CARTE CARREFOUR`. Uniquement pour la catégorisation : le libellé stocké en
 * base reste le libellé brut.
 */
export function normalizeLabel(label: string): string {
  return label
    .replace(/\b\d{2}\/\d{2}\/(?:\d{4}|\d{2})\b/g, "")
    .replace(/\bCB\*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clé de comparaison de deux libellés : insensible à la casse et aux dates / numéros de carte. */
export function labelKey(label: string): string {
  return normalizeLabel(label).toUpperCase();
}
