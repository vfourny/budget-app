const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC", // `@db.Date` : la date est celle du jour civil, sans décalage de fuseau
});

/** 27/09/2026 */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

const euroFormat = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Affichage seul : les montants restent des entiers en centimes partout ailleurs. */
export function formatCents(amountCents: number): string {
  return euroFormat.format(amountCents / 100);
}

const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** 9 → "septembre" (mois 1-12). */
export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

/** 9 → "Septembre". */
export function capitalizedMonthName(month: number): string {
  const name = monthName(month);
  return name.charAt(0).toUpperCase() + name.slice(1);
}
