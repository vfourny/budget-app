import type { db as Db } from "@server/lib/db";
import { validatedTransactions } from "@server/lib/dashboard/scope";
import type {
  ApartmentRecord,
  ApartmentTransaction,
  ManagementInvoiceRecord,
} from "@server/lib/apartments/types";

export interface LoadedApartmentData {
  apartments: ApartmentRecord[];
  /** Transactions validées rattachées à un appartement, de `year - 1` et `year`. */
  transactions: ApartmentTransaction[];
  /** Solde du compte au 1er janvier de `year`, par appartement. */
  openings: Map<string, number>;
  /** Factures de gérance de `year` : appartement → mois → facture. */
  invoices: Map<string, Map<number, ManagementInvoiceRecord>>;
}

/** Charge tout ce qu'il faut pour calculer les appartements d'une année (requêtes uniquement, aucun calcul). */
export async function loadApartmentData(
  db: typeof Db,
  userId: string,
  year: number,
): Promise<LoadedApartmentData> {
  const [apartments, transactions, openings, invoices] = await Promise.all([
    db.apartment.findMany({ where: { userId }, orderBy: [{ acquiredAt: "asc" }, { name: "asc" }] }),
    db.transaction.findMany({
      where: {
        ...validatedTransactions(userId, "APARTMENT"),
        apartmentId: { not: null },
        year: { in: [year - 1, year] },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        date: true,
        label: true,
        amountCents: true,
        category: true,
        apartmentId: true,
        year: true,
        month: true,
      },
    }),
    db.apartmentYearOpening.findMany({ where: { userId, year } }),
    db.managementInvoice.findMany({ where: { userId, year } }),
  ]);

  const invoicesByApartment = new Map<string, Map<number, ManagementInvoiceRecord>>();
  for (const invoice of invoices) {
    const months = invoicesByApartment.get(invoice.apartmentId) ?? new Map();
    months.set(invoice.month, invoice);
    invoicesByApartment.set(invoice.apartmentId, months);
  }

  return {
    apartments: apartments.map((apartment) => ({
      id: apartment.id,
      name: apartment.name,
      kind: apartment.kind,
      managerName: apartment.managerName,
      acquiredAt: apartment.acquiredAt,
      priceCents: apartment.priceCents,
      rentCents: apartment.rentCents,
      depositCents: apartment.depositCents,
      managementFeeBps: apartment.managementFeeBps,
      creditInsuranceCents: apartment.creditInsuranceCents,
      propertyTaxCents: apartment.propertyTaxCents,
      cfeCents: apartment.cfeCents,
      loan:
        apartment.loanPrincipalCents !== null &&
        apartment.loanRateBps !== null &&
        apartment.loanTermMonths !== null &&
        apartment.loanFirstDueDate !== null
          ? {
              principalCents: apartment.loanPrincipalCents,
              rateBps: apartment.loanRateBps,
              termMonths: apartment.loanTermMonths,
              firstDueDate: apartment.loanFirstDueDate,
            }
          : null,
    })),
    // `apartmentId` est non nul (filtré ci-dessus) : Prisma ne le sait pas, on le restreint ici.
    transactions: transactions.flatMap(({ apartmentId, ...transaction }) =>
      apartmentId === null ? [] : [{ ...transaction, apartmentId }],
    ),
    openings: new Map(openings.map((row) => [row.apartmentId, row.openingBalanceCents])),
    invoices: invoicesByApartment,
  };
}
