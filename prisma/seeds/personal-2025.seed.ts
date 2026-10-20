import type { TransactionCategory } from '@server/generated/prisma/enums'
import { db } from '@server/utils/db.client'

import {
  CONTRIBUTION_DAY,
  ownerContributionCents,
} from './apartment-statements-2025.seed'
import { SEED_YEAR } from './seed-year.config'

/**
 * Compte perso 2025, version simplifiée (données de dev local) : environ une douzaine de lignes
 * par mois, calquées sur la répartition d'un export BoursoBank réel (loyer, courses, restaurants,
 * carburant, abonnements, épargne, revenus Stygma) mais avec des montants et des libellés fictifs.
 * L'« Apport appartement » reprend les virements du seed Toulouse (côté perso de R11).
 * Montants en centimes, signés (négatif = débit).
 */
const YEAR = SEED_YEAR

interface MonthlyLine {
  /** Montant de base (centimes), absolu : le signe vient de `credit`. */
  amountCents: number
  category: TransactionCategory
  credit?: true
  /** Jour du mois. */
  day: number
  /** Premier mois (1-12) où la ligne existe. */
  firstMonth?: number
  label: string
  /** Mois (1-12) où la ligne existe, tous si absent. */
  months?: readonly number[]
  /** Variation en centimes autour du montant de base (0 = montant fixe). */
  spreadCents?: number
}

const MONTHLY_LINES = [
  // Revenus : salaire du bulletin (depuis l'entrée en mars 2025), BNC, vacations d'enseignement.
  {
    label: 'VIR SEPA SARL STYGMA Salaire',
    amountCents: 50_582,
    category: 'SALARY_PAYMENT',
    credit: true,
    day: 30,
    firstMonth: 3,
  },
  {
    label: 'VIR INST SARL STYGMA BNC',
    amountCents: 350_000,
    category: 'BNC_PAYMENT',
    credit: true,
    day: 12,
    spreadCents: 50_000,
  },
  {
    label: 'VIR SEPA IUT Vacations',
    amountCents: 60_000,
    category: 'VACATION_PAYMENT',
    credit: true,
    day: 20,
    months: [2, 6, 12],
    spreadCents: 10_000,
  },
  // Charges fixes.
  {
    label: 'VIR INST Loyer',
    amountCents: 110_000,
    category: 'RENT_PAID',
    day: 10,
  },
  {
    label: 'PRLV SEPA Bouygues Telecom Mobile',
    amountCents: 1_499,
    category: 'TELECOM',
    day: 30,
  },
  {
    label: 'PRLV SEPA Assurance auto',
    amountCents: 6_200,
    category: 'BANK_INSURANCE',
    day: 8,
  },
  {
    label: 'PRLV SEPA Abonnement streaming',
    amountCents: 1_399,
    category: 'OTHER_SUBSCRIPTIONS',
    day: 6,
  },
  // Dépenses courantes : un ou deux achats représentatifs par catégorie.
  {
    label: 'CARTE Supermarché',
    amountCents: 8_500,
    category: 'GROCERIES',
    day: 4,
    spreadCents: 2_000,
  },
  {
    label: 'CARTE Supermarché',
    amountCents: 7_500,
    category: 'GROCERIES',
    day: 14,
    spreadCents: 2_000,
  },
  {
    label: 'CARTE Marché & primeur',
    amountCents: 6_000,
    category: 'GROCERIES',
    day: 22,
    spreadCents: 1_500,
  },
  {
    label: 'CARTE Restaurant',
    amountCents: 4_200,
    category: 'RESTAURANT',
    day: 9,
    spreadCents: 1_500,
  },
  {
    label: 'CARTE Restaurant',
    amountCents: 3_600,
    category: 'RESTAURANT',
    day: 23,
    spreadCents: 1_500,
  },
  {
    label: 'CARTE Station-service',
    amountCents: 6_500,
    category: 'FUEL',
    day: 7,
    spreadCents: 1_500,
  },
  {
    label: 'CARTE Station-service',
    amountCents: 6_000,
    category: 'FUEL',
    day: 21,
    spreadCents: 1_500,
  },
  {
    label: 'CARTE Vêtements',
    amountCents: 5_500,
    category: 'CLOTHING_CARE',
    day: 16,
    spreadCents: 2_500,
  },
  {
    label: 'CARTE Club de sport',
    amountCents: 4_500,
    category: 'LEISURE',
    day: 3,
  },
  {
    label: 'CARTE Bar',
    amountCents: 3_200,
    category: 'NIGHTLIFE',
    day: 25,
    months: [1, 3, 5, 7, 9, 11, 12],
    spreadCents: 1_000,
  },
  {
    label: 'CARTE Pharmacie',
    amountCents: 2_400,
    category: 'HEALTH',
    day: 18,
    months: [2, 4, 6, 8, 10, 12],
    spreadCents: 800,
  },
  {
    label: 'CARTE SNCF',
    amountCents: 4_900,
    category: 'TRANSPORT',
    day: 27,
    months: [3, 6, 9, 12],
    spreadCents: 1_500,
  },
  {
    label: 'CARTE Formation en ligne',
    amountCents: 4_990,
    category: 'TRAINING',
    day: 11,
    months: [2, 9],
  },
  // Épargne.
  {
    label: 'VIR SEPA Assurance-vie',
    amountCents: 20_000,
    category: 'LONG_TERM_SAVINGS',
    day: 5,
  },
  {
    label: 'VIR INST Livret',
    amountCents: 15_000,
    category: 'SHORT_TERM_SAVINGS',
    day: 5,
  },
] as const satisfies readonly MonthlyLine[]

export interface SeedPersonalTransaction {
  amountCents: number
  category: TransactionCategory
  date: Date
  label: string
}

/** Variation déterministe dans `[-spread, +spread]` (pas de hasard : le seed reste reproductible). */
function spreadOf(spreadCents: number, month: number, lineIndex: number) {
  if (spreadCents === 0) return 0
  const step = Math.round(spreadCents / 4)
  return (((month * 7 + lineIndex * 13) % 9) - 4) * step
}

/** Transactions perso d'un mois (1-12), triées par date. Fonction pure. */
function buildPersonalMonth2025(month: number): SeedPersonalTransaction[] {
  const lastDay = new Date(Date.UTC(YEAR, month, 0)).getUTCDate()
  const dateOf = (day: number) =>
    new Date(Date.UTC(YEAR, month - 1, Math.min(day, lastDay)))

  const transactions: SeedPersonalTransaction[] = []
  MONTHLY_LINES.forEach((line, index) => {
    const firstMonth = 'firstMonth' in line ? line.firstMonth : 1
    if (month < firstMonth) return
    if ('months' in line && !line.months.some((m) => m === month)) return
    const spread = 'spreadCents' in line ? line.spreadCents : 0
    const amountCents = line.amountCents + spreadOf(spread, month, index)
    transactions.push({
      date: dateOf(line.day),
      label: line.label,
      amountCents: 'credit' in line ? amountCents : -amountCents,
      category: line.category,
    })
  })

  // Miroir du seed Toulouse : virement vers le compte appartement.
  const contributionCents = ownerContributionCents(month)
  if (contributionCents !== null)
    transactions.push({
      date: dateOf(CONTRIBUTION_DAY),
      label: 'VIR INST Apport appartement Toulouse',
      amountCents: -contributionCents,
      category: 'APARTMENT_CONTRIBUTION',
    })

  return transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Un mois qui a déjà son import n'est jamais touché : les saisies faites dans l'app restent. */
export async function seedPersonal2025(userId: string) {
  let imported = 0
  for (let month = 1; month <= 12; month++) {
    const fileName = `personal-${YEAR}-${String(month).padStart(2, '0')}.csv`
    const existing = await db.importBatch.findFirst({
      where: { userId, accountType: 'PERSONAL', fileName },
      select: { id: true },
    })
    if (existing) continue
    await db.importBatch.create({
      data: {
        userId,
        accountType: 'PERSONAL',
        fileName,
        status: 'VALIDATED',
        validatedAt: new Date(Date.UTC(YEAR, month, 1)),
        transactions: {
          create: buildPersonalMonth2025(month).map((transaction) => ({
            ...transaction,
            userId,
            accountType: 'PERSONAL',
            month,
            year: YEAR,
          })),
        },
      },
    })
    imported++
  }
  process.stdout.write(
    `Perso ${YEAR} : ${imported} relevé(s) importé(s)` + '\n',
  )
}
