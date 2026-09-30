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
