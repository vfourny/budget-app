import { db } from "@server/lib/db";
import { workingDays } from "@shared/working-days";

/**
 * Facturation Pro de départ : un client, tous les jours ouvrés du mois (hors fériés), en prévu sur
 * toute l'année et en réel jusqu'à `actualUntilMonth`.
 */
const PROFESSIONAL_BILLING_SEED = {
  year: 2026,
  clientName: "Davidson",
  forecastDailyRateCents: 40_000,
  actualDailyRateCents: 45_000,
  actualUntilMonth: 9,
} as const;

/** Un mois (et un type prévu / réel) qui a déjà des lignes n'est jamais touché : les saisies de l'éditeur restent. */
export async function seedProfessionalBilling(userId: string) {
  const seed = PROFESSIONAL_BILLING_SEED;
  const kinds = [
    { kind: "FORECAST", dailyRateCents: seed.forecastDailyRateCents, lastMonth: 12 },
    { kind: "ACTUAL", dailyRateCents: seed.actualDailyRateCents, lastMonth: seed.actualUntilMonth },
  ] as const;

  let created = 0;
  for (const { kind, dailyRateCents, lastMonth } of kinds) {
    const filled = await db.billingLine.findMany({
      where: { userId, year: seed.year, kind },
      distinct: ["month"],
      select: { month: true },
    });
    const months = Array.from({ length: lastMonth }, (_, index) => index + 1).filter(
      (month) => !filled.some((line) => line.month === month),
    );
    const { count } = await db.billingLine.createMany({
      data: months.map((month) => ({
        userId,
        year: seed.year,
        month,
        kind,
        clientName: seed.clientName,
        dailyRateCents,
        days: workingDays(seed.year, month),
      })),
    });
    created += count;
  }
  process.stdout.write(`Facturation Pro ${seed.year} : ${created} ligne(s) créée(s)` + "\n");
}
