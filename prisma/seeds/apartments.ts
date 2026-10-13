import { db } from '@server/lib/db'

import { buildApartmentStatements2025 } from './apartment-statements-2025'
import { SEED_YEAR } from './seed-year'

/**
 * Deux appartements (données de dev local) : Toulouse, loué meublé et géré par Myroom, et Lyon
 * (fictif), loué en direct. Montants en centimes, taux en points de base (3,00 % = 300).
 *
 * Toulouse est recalé sur les relevés réels d'août et septembre 2026 : échéance de prêt de
 * 1 137,73 € (capital 602,98 € + intérêts 534,75 € pour l'échéance du 30/08/2026), assurance
 * emprunteur Kereis 14,21 €/mois, loyer net 735,31 €. Le prêt (capital, taux, durée) est
 * reconstitué pour retomber sur ces chiffres : à remplacer par ceux du tableau d'amortissement
 * réel. Le prix d'achat est une estimation. Ses relevés 2025 sont dans `apartment-statements-2025.ts`.
 */
const APARTMENTS_SEED = [
  {
    name: 'Toulouse',
    kind: 'FURNISHED',
    managed: true,
    acquiredAt: new Date(Date.UTC(2025, 3, 1)),
    priceCents: 20_000_000,
    rentCents: 79_000,
    depositCents: 79_000,
    managementFeeBps: 700,
    creditInsuranceCents: 1_421,
    propertyTaxCents: 95_000,
    cfeCents: 21_000,
    loanPrincipalCents: 19_218_000,
    loanRateBps: 350,
    loanTermMonths: 233,
    loanFirstDueDate: new Date(Date.UTC(2025, 4, 30)),
    // Pas de solde d'ouverture ici : voir `seedToulouseStatements2025`.
    openingBalanceCents: null,
  },
  {
    name: 'Lyon',
    kind: 'FURNISHED',
    managed: false,
    acquiredAt: new Date(Date.UTC(SEED_YEAR, 0, 1)),
    priceCents: 14_200_000,
    rentCents: 62_000,
    depositCents: 62_000,
    managementFeeBps: 0,
    creditInsuranceCents: 1_800,
    propertyTaxCents: 70_000,
    cfeCents: 18_000,
    loanPrincipalCents: 12_000_000,
    loanRateBps: 350,
    loanTermMonths: 240,
    loanFirstDueDate: new Date(Date.UTC(SEED_YEAR, 1, 5)),
    openingBalanceCents: 0,
  },
] as const

const TOULOUSE_NAME = 'Toulouse'

/** Un appartement déjà présent (même nom) n'est jamais touché : les saisies faites dans l'app restent. */
export async function seedApartments(userId: string) {
  const year = SEED_YEAR
  let created = 0
  for (const { openingBalanceCents, ...apartment } of APARTMENTS_SEED) {
    const existing = await db.apartment.findFirst({
      where: { userId, name: apartment.name },
      select: { id: true },
    })
    if (existing) continue
    await db.apartment.create({
      data: {
        ...apartment,
        userId,
        yearOpenings:
          openingBalanceCents === null
            ? undefined
            : { create: { userId, year, openingBalanceCents } },
      },
    })
    created++
  }
  process.stdout.write(`Appartements : ${created} créé(s)` + '\n')
}

/**
 * Relevés 2025 de Toulouse : un import validé par mois (avril à décembre), les factures de gérance,
 * et les soldes d'ouverture (0 en 2025, solde de clôture 2025 en 2026). Un mois qui a déjà son
 * import, une facture ou un solde d'ouverture n'est jamais touché : les saisies faites dans l'app restent.
 */
export async function seedToulouseStatements2025(userId: string) {
  const apartment = await db.apartment.findFirst({
    where: { userId, name: TOULOUSE_NAME },
  })
  if (
    !apartment ||
    apartment.loanPrincipalCents === null ||
    apartment.loanRateBps === null ||
    apartment.loanTermMonths === null ||
    apartment.loanFirstDueDate === null
  )
    return

  const { year, statements, managementInvoices, closingBalanceCents } =
    buildApartmentStatements2025({
      loan: {
        principalCents: apartment.loanPrincipalCents,
        rateBps: apartment.loanRateBps,
        termMonths: apartment.loanTermMonths,
        firstDueDate: apartment.loanFirstDueDate,
      },
      propertyTaxCents: apartment.propertyTaxCents,
      rentCents: apartment.rentCents,
    })

  await db.apartmentYearOpening.createMany({
    data: [
      { userId, apartmentId: apartment.id, year, openingBalanceCents: 0 },
      {
        userId,
        apartmentId: apartment.id,
        year: year + 1,
        openingBalanceCents: closingBalanceCents,
      },
    ],
    skipDuplicates: true,
  })
  await db.managementInvoice.createMany({
    data: managementInvoices.map(({ month, feesCents }) => ({
      userId,
      apartmentId: apartment.id,
      year,
      month,
      feesCents,
    })),
    skipDuplicates: true,
  })

  let imported = 0
  for (const { month, transactions } of statements) {
    const fileName = `toulouse-${year}-${String(month).padStart(2, '0')}.csv`
    const existing = await db.importBatch.findFirst({
      where: { userId, apartmentId: apartment.id, fileName },
      select: { id: true },
    })
    if (existing) continue
    await db.importBatch.create({
      data: {
        userId,
        apartmentId: apartment.id,
        accountType: 'APARTMENT',
        fileName,
        status: 'VALIDATED',
        validatedAt: new Date(Date.UTC(year, month, 1)),
        transactions: {
          create: transactions.map((transaction) => ({
            ...transaction,
            userId,
            apartmentId: apartment.id,
            accountType: 'APARTMENT',
            month,
            year,
          })),
        },
      },
    })
    imported++
  }
  process.stdout.write(
    `Appartement ${TOULOUSE_NAME} ${year} : ${imported} relevé(s) importé(s), solde de clôture ${(closingBalanceCents / 100).toFixed(2)} €` +
      '\n',
  )
}
