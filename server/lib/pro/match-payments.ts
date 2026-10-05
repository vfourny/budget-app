/** Facture réelle d'un client pour un mois (TTC). */
export interface Invoice {
  clientId: string;
  year: number;
  month: number;
  ttcCents: number;
}

/** Client et texte à chercher dans le libellé bancaire de ses virements. */
export interface PayerClient {
  clientId: string;
  /** Mot-clé bancaire, à défaut le nom du client. */
  keyword: string;
}

/** Crédit « Encaissement client » du relevé pro. */
export interface Payment {
  date: Date;
  label: string;
  amountCents: number;
}

export const invoiceKey = (invoice: Pick<Invoice, "clientId" | "year" | "month">) =>
  `${invoice.clientId}:${invoice.year}-${invoice.month}`;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();

/**
 * Rapproche les encaissements des factures, client par client : un virement dont le libellé
 * contient le mot-clé du client paie ses factures de la plus ancienne à la plus récente (FIFO),
 * parmi celles des **mois antérieurs** au virement (une prestation est facturée en fin de mois et
 * payée ensuite : un virement de janvier ne paie pas la facture de janvier, mais celles d'avant).
 * Renvoie l'encaissé par facture (`invoiceKey`). Un virement qu'aucun client ne reconnaît, ou qui
 * paie des factures absentes de l'app (années précédentes), est ignoré.
 */
export function matchPayments(
  invoices: readonly Invoice[],
  clients: readonly PayerClient[],
  payments: readonly Payment[],
): Map<string, number> {
  const paid = new Map<string, number>();
  const sortedPayments = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const client of clients) {
    const keyword = normalize(client.keyword.trim());
    if (!keyword) continue;
    const queue = invoices
      .filter((invoice) => invoice.clientId === client.clientId && invoice.ttcCents > 0)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((invoice) => ({
        key: invoiceKey(invoice),
        index: invoice.year * 12 + invoice.month - 1,
        left: invoice.ttcCents,
      }));

    for (const payment of sortedPayments) {
      if (!normalize(payment.label).includes(keyword)) continue;
      let left = payment.amountCents;
      const paymentIndex = payment.date.getUTCFullYear() * 12 + payment.date.getUTCMonth();
      for (const invoice of queue) {
        if (left <= 0 || invoice.index >= paymentIndex) break;
        const share = Math.min(left, invoice.left);
        if (share <= 0) continue;
        invoice.left -= share;
        left -= share;
        paid.set(invoice.key, (paid.get(invoice.key) ?? 0) + share);
      }
    }
  }
  return paid;
}
