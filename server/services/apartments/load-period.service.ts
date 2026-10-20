import type { db as Db } from '@server/utils/db.client'
import { validatedTransactions } from '@server/services/transactions/scope.service'
import type {
  ApartmentForecastRecord,
  ApartmentRecord,
  ApartmentTransaction,
  ManagementInvoiceRecord,
} from '@shared/apartments/apartment.type'

export interface LoadedApartmentData {
  apartments: ApartmentRecord[]
  /** Saisies du prévisionnel jusqu'à `year` inclus, par appartement. */
  forecasts: Map<string, ApartmentForecastRecord[]>
  /** Factures de gérance de `year` : appartement → mois → facture. */
  invoices: Map<string, Map<number, ManagementInvoiceRecord>>
  /** Solde du compte au 1er janvier de `year`, par appartement. */
  openings: Map<string, number>
  /** Transactions validées rattachées à un appartement, de `year - 1` et `year`. */
  transactions: ApartmentTransaction[]
}

/** Charge tout ce qu'il faut pour calculer les appartements d'une année (requêtes uniquement, aucun calcul). */
export async function loadApartmentData(
  db: typeof Db,
  userId: string,
  year: number,
): Promise<LoadedApartmentData> {
  const [apartments, transactions, openings, invoices, forecasts] =
    await Promise.all([
      db.apartment.findMany({
        where: { userId },
        orderBy: [{ acquiredAt: 'asc' }, { name: 'asc' }],
      }),
      db.transaction.findMany({
        where: {
          ...validatedTransactions(userId, 'APARTMENT'),
          apartmentId: { not: null },
          year: { in: [year - 1, year] },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
      db.apartmentForecast.findMany({
        where: { userId, year: { lte: year } },
        select: {
          apartmentId: true,
          year: true,
          month: true,
          line: true,
          amountCents: true,
        },
      }),
    ])

  const invoicesByApartment = new Map<
    string,
    Map<number, ManagementInvoiceRecord>
  >()
  for (const invoice of invoices) {
    const months = invoicesByApartment.get(invoice.apartmentId) ?? new Map()
    months.set(invoice.month, invoice)
    invoicesByApartment.set(invoice.apartmentId, months)
  }

  const forecastsByApartment = new Map<string, ApartmentForecastRecord[]>()
  for (const { apartmentId, ...forecast } of forecasts) {
    forecastsByApartment.set(apartmentId, [
      ...(forecastsByApartment.get(apartmentId) ?? []),
      forecast,
    ])
  }

  return {
    apartments: apartments.map((apartment) => ({
      id: apartment.id,
      name: apartment.name,
      kind: apartment.kind,
      managed: apartment.managed,
      acquiredAt: apartment.acquiredAt,
      priceCents: apartment.priceCents,
      managementFeeBps: apartment.managementFeeBps,
      creditInsuranceCents: apartment.creditInsuranceCents,
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
    openings: new Map(
      openings.map((row) => [row.apartmentId, row.openingBalanceCents]),
    ),
    invoices: invoicesByApartment,
    forecasts: forecastsByApartment,
  }
}
